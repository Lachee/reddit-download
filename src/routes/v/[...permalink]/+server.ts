import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import {
  queryMediaCollection,
  type Variant,
  sort,
  VariantType,
  getMediaCollection,
  type Media
} from "$lib/reddit/server/Media";
import { combineStream } from "$lib/server/ffmpeg/Combine";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { cacheSemaphore, getCache, keyName } from "$lib/cache/MemoryCache";
import { createReadableStream } from "$lib/server/ffmpeg/ReadableStreamWithStore";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

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
  const mediaId = url.searchParams.get('media');
  const key = keyName('GET', url.pathname, mediaId ?? '');
  const cached = await getCache<Response>(key);
  if (cached) {
    return new Response(cached.body, { status: cached.status, headers: cached.headers });
  }

  return cacheSemaphore<CachedResponse, Response>(key, async (store, abort) => {
    const post = await fetchPost(fetch, normalizePermalink(params.permalink));
    const collection = await queryMediaCollection(fetch, getMediaCollection(post))
    const variants = collection.filter(m => !mediaId || m.id === mediaId).flatMap(m => m.variants)
      .filter(
        v => v.type === VariantType.Video
          || v.type === VariantType.PartialVideo
          || v.type === VariantType.PartialAudio
      );

    const best = findBestVariant(variants);
    if (best.type === VariantType.PartialVideo) {
      const video = best;
      const audio = variants.find(m => m.type === VariantType.PartialAudio);
      if (audio) {
        const { stream, ffmpeg } = combineStream({
          videoPath: video.href,
          audioPath: audio.href,
        });

        const headers = {
          "Content-Type":        "video.mp4",
          "Content-Disposition": `inline; filename="video.mp4"`,
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
    }

    // Otherwise, use the best gif or whatever we have as a fallback
    const { href } = best;
    const response = await fetch(href, {
      redirect: 'follow',
      headers:  { 'origin': 'reddit.com', 'User-Agent': UserAgent }
    });
    const init = {
      status:  200,
      headers: {
        "Content-Type":  response.headers.get('Content-Type') ?? 'image/mp4',
        "Cache-Control": "public, max-age=3600",
      }
    }

    // It's unclear if we actually need to cache this or if we can just store zero bytes, forcing new requests.
    const bytes = new Uint8Array(await response.arrayBuffer());
    store({
      body: bytes,
      ...init
    });

    return new Response(bytes, init);
  })
};