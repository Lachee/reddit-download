import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import type { Post } from "$lib/reddit/schema/postSchema";
import { fetchMedia, type Media, sort, Variant } from "$lib/reddit/server/Media";
import { authenticate } from "$lib/reddit/server/Authentication";
import { combineStream } from "$lib/server/ffmpeg/Combine";
import { Readable } from "node:stream";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { cacheSemaphore, getCache, keyName } from "$lib/cache/MemoryCache";
import { createReadableStream } from "$lib/server/ffmpeg/ReadableStreamWithStore";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

type CachedResponse = {
  body: BodyInit,
  status: number,
  headers: HeadersInit,
}

export const GET: RequestHandler = async ({ url, params, fetch }) => {
  const key = keyName('GET', url.pathname);
  const cached = await getCache<Response>(key);
  if (cached) {
    return new Response(cached.body, { status: cached.status, headers: cached.headers });
  }

  return cacheSemaphore<CachedResponse, Response>(key, async (store, abort) => {
    const post = await fetchPost(fetch, normalizePermalink(params.permalink));
    const media = await fetchMedia(post).then(sort)
    const best = media[0];

    if (best.variant === Variant.PartialVideo) {
      const video = best;
      const audio = media.find(m => m.variant === Variant.PartialAudio);
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
    const response = await fetch(href, { headers: { 'origin': 'reddit.com', 'User-Agent': UserAgent } });
    response.bytes().then(bytes => {
      store({
        body:    bytes,
        status:  response.status,
        headers: response.headers,
      });
    })

    return response;
  })
};