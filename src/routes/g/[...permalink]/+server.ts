import type { RequestHandler } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import { getMediaCollection, queryMediaCollection, sort, type Variant, VariantType } from "$lib/reddit/server/Media";
import { type ConvertOptions, convertStream } from "$lib/server/ffmpeg/Gif";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { cache } from "$lib/cache/";
import { createReadableStream } from "$lib/server/ffmpeg/ReadableStreamWithStore";
import { probeDuration } from "$lib/server/ffmpeg/Probe";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";
const LongestVideoDuration = 15;

type CachedResponse = {
  body: BodyInit,
  status: number,
  headers: HeadersInit,
}

function findBestVariant(variants: Variant[]): Variant {
  let bestVariant: Variant = variants[0];
  for (const variant of variants) {
    if (variant.type === VariantType.PartialVideo && bestVariant.type != VariantType.PartialVideo)
      bestVariant = variant;

    if (variant.dimension && (!bestVariant.dimension || bestVariant.dimension.width < variant.dimension.width))
      bestVariant = variant;
  }
  return bestVariant;
}

export const GET: RequestHandler = async ({ url, params, fetch }) => {
  // Return the cached response if it exists / is currently being processed
  const mediaId = url.searchParams.get('media');
  const key = ['GET', url.pathname, mediaId ?? ''];
  const cached = await cache().get<CachedResponse>(key);
  if (cached) {
    return new Response(cached.body, { status: cached.status, headers: cached.headers });
  }

  // We do not have a cache, so lets stream a response and store the result at the end
  return await cache().lock<CachedResponse, Response>(key, async (store, abort) => {
    const post = await fetchPost(fetch, normalizePermalink(params.permalink));
    const collection = await queryMediaCollection(fetch, getMediaCollection(post))
    const responseHeaders: Record<string, string> = {
      "Content-Type":        "image/gif",
      "Content-Disposition": `inline; filename="animated.gif"`,
      "Cache-Control":       "public, max-age=3600",
    };

    // Find the best available gif and video
    // We will determine if we should convert the video to a gif by checking if the video is wider than the gif.
    const variants = collection.filter(m => !mediaId || m.id === mediaId).flatMap(m => m.variants)
    const gif = findBestVariant(variants.filter(m => m.type === VariantType.GIF));
    const video = findBestVariant(variants.filter(m => m.type === VariantType.Video || m.type === VariantType.PartialVideo));
    const shouldConvert = video && (!gif || !gif.dimension || (video.dimension && video.dimension.width > gif.dimension.width));

    if (shouldConvert && video) {
      // Ensure the video is not too long, otherwise we will not be able to convert it.
      // We will report back any discrepancies in the headers.
      console.log('The best is a video, checking if its eligible for conversion...', video.href);
      const duration = await probeDuration(video.href);
      responseHeaders['X-Converted-From'] = video.href;
      responseHeaders['X-Converted-Duration'] = `${duration}s`;
      responseHeaders['X-Converted-At'] = new Date().toISOString()

      if (duration <= LongestVideoDuration) {
        const scale = video.dimension?.height || video.dimension?.width || 480;
        const opts: ConvertOptions = {
          videoPath: video.href,
          fps:       scale > 360 ? 10 : 20,
          scale:     scale,
        };
        opts.fps = 10;

        responseHeaders['X-Converted-To'] = `animated.gif`;
        responseHeaders['X-Converted-Scale'] = `${scale}x${scale}`;
        responseHeaders['X-Converted-FPS'] = `${opts.fps}fps`;

        console.log('The best is a video, converting to a gif...', opts);
        const { stream, ffmpeg } = convertStream(opts);
        const body = createReadableStream(stream, ffmpeg, (bytes) => store({
          body:    bytes,
          status:  200,
          headers: responseHeaders,
        }), abort);

        return new Response(body, {
          status:  200,
          headers: responseHeaders,
        });
      } else {
        console.log('The best is a video, but its too long, skipping conversion', duration);
        responseHeaders['X-Converted-Error'] = `Video is too long. Cannot convert above ${LongestVideoDuration} seconds.`
      }
    }

    // Otherwise, use the best gif or whatever we have as a fallback
    const { href } = gif ?? variants[0];
    console.log("Fetching media from", href)
    const response = await fetch(href, {
      redirect: 'follow',
      headers:  { 'origin': 'reddit.com', 'User-Agent': UserAgent }
    });

    responseHeaders['Content-Type'] = response.headers.get('Content-Type') ?? 'image/gif';
    responseHeaders['Content-Disposition'] = response.headers.get('Content-Disposition') ?? 'inline; filename="animated.gif"';

    const init = {
      status:  200,
      headers: responseHeaders,
    }

    // It's unclear if we actually need to cache this or if we can just store zero bytes, forcing new requests.
    const bytes = new Uint8Array(await response.arrayBuffer());
    store({
      body: bytes,
      ...init
    });

    return new Response(bytes, init);
  });
}