import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import type { Post } from "$lib/reddit/schema/postSchema";
import { fetchMedia, type Media, sort, Variant } from "$lib/reddit/server/Media";
import { authenticate } from "$lib/reddit/server/Authentication";
import { type ConvertOptions, convertStream } from "$lib/server/ffmpeg/Gif";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { getCache, cacheSemaphore, keyName } from "$lib/cache/MemoryCache";
import { createReadableStream } from "$lib/server/ffmpeg/ReadableStreamWithStore";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

type CachedResponse = {
  body: BodyInit,
  status: number,
  headers: HeadersInit,
}

export const GET: RequestHandler = async ({ url, params, fetch }) => {
  // Return the cached response if it exists / is currently being processed
  const key = keyName('GET', url.pathname);
  const cached = await getCache<CachedResponse>(key);
  if (cached) {
    return new Response(cached.body, { status: cached.status, headers: cached.headers });
  }

  // We do not have a cache, so lets stream a response and store the result at the end
  return cacheSemaphore<CachedResponse, Response>(key, async (store, abort) => {
    const post = await fetchPost(fetch, normalizePermalink(params.permalink));
    const media = await fetchMedia(post).then(sort)

    // Find the best available gif and video
    // We will determine if we should convert the video to a gif by checking if the video is wider than the gif.
    const gif = media.find(m => m.variant === Variant.GIF);
    const video = media.find(m => m.variant === Variant.Video || m.variant === Variant.PartialVideo);
    const shouldConvert = video && (!gif || !gif.dimension || (video.dimension && video.dimension.width > gif.dimension.width));

    if (shouldConvert && video) {
      console.log('The best is a video, converting to a gif.');
      const scale = video.dimension?.height || video.dimension?.width || 480;
      const opts: ConvertOptions = {
        videoPath: video.href,
        fps:       scale > 360 ? 10 : 20,
        scale:     scale,
      };
      opts.fps = 10;

      const { stream, ffmpeg } = convertStream(opts);
      const headers = {
        "Content-Type":        "image/gif",
        "Content-Disposition": `inline; filename="animated.gif"`,
        "Cache-Control":       "public, max-age=3600",
      };

      const body = createReadableStream(stream, ffmpeg, (bytes) => store({
        body:   bytes,
        status: 200,
        headers,
      }), abort);

      return new Response(body, {
        status: 200,
        headers,
      });
    }

    // Otherwise, use the best gif or whatever we have as a fallback
    const { href } = gif ?? media[0];
    const response = await fetch(href, { headers: { 'origin': 'reddit.com', 'User-Agent': UserAgent } });
    response.bytes().then(bytes => {
      store({
        body:    bytes,
        status:  response.status,
        headers: response.headers,
      });
    })

    return response;
  });
}