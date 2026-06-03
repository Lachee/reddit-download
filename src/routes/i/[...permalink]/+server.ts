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
    const media = await fetchMedia(fetch, post).then(sort)

    // Find the best available image and video
    // We will determine if we should convert the video to a image by checking if the video is wider than the image.
    const best = media.find(m => m.variant === Variant.Image);

    // Otherwise, use the best image or whatever we have as a fallback
    const { href } = best ?? media[0];
    const response = await fetch(href, {
      redirect: 'follow',
      headers: { 'origin': 'reddit.com', 'User-Agent': UserAgent }
    });

    const init = {
      status:  200,
      headers: {
        "Content-Type":  response.headers.get('Content-Type') ?? 'image/jpeg',
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
  });
}