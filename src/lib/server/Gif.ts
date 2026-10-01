import { findBiggestVariant, VariantType, type MediaCollection } from "$lib/reddit/Media";
import { convertTee, type ConvertOptions } from "$lib/server/ffmpeg/Gif";
import { cache } from "$lib/server/cache";
import { probeDuration } from "$lib/server/ffmpeg/Probe";
import { normalizeMedialink } from "$lib/reddit/Utilities";
import type { Post } from "$lib/reddit/schema/postSchema";
import { env } from "$env/dynamic/private";
import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const CONTENT_TTL = +(env.CACHE_GIF_TTL ?? 3600);
const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";
const LongestVideoDuration = 60;

/** Longest edge of a converted gif. Embeds display them at ~400px, and encode time scales with the pixel count. */
const MaxGifSize = 640;

export type CachedGif = ({
  content: Uint8Array<ArrayBuffer>,
  mime: string,
  filename: string,
  status: number,
  error: string | null,
} | { redirect: string });

/** A gif that is still being converted. The body streams the frames as they are encoded. */
export type ConvertingGif = {
  body: ReadableStream<Uint8Array>,
  /** Resolves with the cached response once the conversion has finished. */
  done: Promise<CachedGif & { content: Uint8Array<ArrayBuffer> }>,
  mime: string,
  filename: string,
  duration: number,
  size: number,
};

export type GifOptions = {
  post: Post,
  collection: MediaCollection,
  permalink: string,
  mediaId: string | false,
  fetch: typeof window.fetch,
};

/**
 * Gets the gif of the post, either from the cache or by starting a new conversion.
 * Conversions are cached once they finish, and concurrent requests for the same gif wait on the one in flight.
 */
export async function resolveGif({ post, collection, permalink, mediaId, fetch }: GifOptions): Promise<CachedGif | ConvertingGif> {
  const key = [ 'GET', `/g/${normalizeMedialink(permalink)}`, mediaId || '' ];
  const cached = await cache().get<CachedGif>(key);
  if (cached !== undefined)
    return cached;

  return await cache().lock<CachedGif, CachedGif | ConvertingGif>(key, async (store, abort) => {
    // Find the best available gif and video
    // We will determine if we should convert the video to a gif by checking if the video is wider than the gif.
    const variants = collection.filter(m => !mediaId || m.id === mediaId).flatMap(m => m.variants)
    const gif = findBiggestVariant(variants.filter(m => m.type === VariantType.GIF));
    const video = findBiggestVariant(variants.filter(m => m.type === VariantType.Video || m.type === VariantType.PartialVideo));
    const shouldConvert = video && (!gif || !gif.dimension || (video.dimension && video.dimension.width > gif.dimension.width));
    let convertError = null;

    if (shouldConvert && video) {
      // Ensure the video is not too long, otherwise we will not be able to convert it.
      // We will report back any discrepancies in the headers.
      const duration = video.duration ?? await probeDuration(video.href);
      if (duration <= LongestVideoDuration) {
        const { width = MaxGifSize, height = MaxGifSize } = video.dimension ?? {};
        const size = Math.min(Math.max(width, height) || MaxGifSize, MaxGifSize);
        const opts: ConvertOptions = {
          videoPath: video.href,
          fps:       size > 360 ? 10 : 24,
          maxSize:   size,
          filtering: 'bicubic',
          dithering: 'bayer:bayer_scale=5',
          maxColors: 128,
        };

        console.log(`[gif] converting ${post.id}/${mediaId || 'all'} (${Math.round(duration)}s, ${video.dimension?.width ?? '?'}x${video.dimension?.height ?? '?'}) to a gif at ${opts.fps}fps, max ${size}px`);
        const filename = `${post.id}-${video.id}.gif`;
        // ffmpeg reads the video twice (frames and palette), and is slower at fetching it than we are.
        // So the video is downloaded once and converted from disk.
        const startAt = Date.now();
        const localPath = await download(video.href, fetch);
        console.log(`[gif] downloaded ${video.href} in ${Date.now() - startAt}ms`);

        const { body, done } = convertTee({ ...opts, videoPath: localPath });
        done.finally(() => rm(localPath, { force: true })).catch(() => undefined);
        const finished = done.then(buffer => {
          const value = {
            content: new Uint8Array(buffer),
            mime:    'image/gif',
            filename,
            status:  200,
            error:   null,
          };
          store(value);
          return value;
        }, error => {
          abort(error);
          throw error;
        });

        // Nothing may be waiting on the conversion (the client went away), so the failure is only logged.
        finished.catch(error => console.error(`[gif] converting ${post.id}/${mediaId || 'all'} failed`, error));
        return { body, done: finished, mime: 'image/gif', filename, duration, size } satisfies ConvertingGif;
      } else {
        console.log(`[gif] not converting ${post.id}/${mediaId || 'all'}, it is ${Math.round(duration)}s which is over the ${LongestVideoDuration}s limit`);
        convertError = `Video is too long. Cannot convert above ${LongestVideoDuration} seconds.`
      }
    }

    // We did not convert a video, so we will use a fullback gif, otherwise let the image route handle it.
    if (!gif) {
      console.log(`[gif] ${post.id}/${mediaId || 'all'} has no gif${convertError ? ' and could not be converted' : ' or video'}, redirecting to the image`)
      const value = { redirect: `/i/${normalizeMedialink(permalink)}?m=${mediaId || ''}&s=best` } satisfies CachedGif;
      store(value);
      return value;
    }

    const { href } = gif;
    console.log(`[gif] using reddit's gif for ${post.id}/${mediaId || 'all'} (${gif.dimension?.width ?? '?'}x${gif.dimension?.height ?? '?'}) from ${href}`)
    const response = await fetch(href, {
      redirect: 'follow',
      headers:  { 'origin': 'reddit.com', 'User-Agent': UserAgent }
    });

    if (!response.ok)
      console.warn(`[gif] fetching ${href} failed: ${response.status} ${response.statusText}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    const value = {
      content:  bytes,
      mime:     response.headers.get('Content-Type') ?? 'image/gif',
      filename: `${post.id}-${(gif ?? variants[0]).id}.gif`,
      status:   response.status,
      error:    convertError,
    } satisfies CachedGif;
    store(value);
    return value;
  }, CONTENT_TTL);
}

/** Downloads the url to a temporary file, returning its path. */
async function download(url: string, fetch: typeof window.fetch): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': UserAgent } });
  if (!response.ok || !response.body)
    throw new Error(`failed to download ${url}: ${response.status} ${response.statusText}`);

  const filePath = path.join(tmpdir(), `reddit-download-${randomUUID()}`);
  try {
    await pipeline(Readable.fromWeb(response.body as any), createWriteStream(filePath));
  } catch (error) {
    await rm(filePath, { force: true });
    throw error;
  }

  return filePath;
}
