import type { RequestHandler } from './$types';
import { findBiggestVariant, VariantType, } from "$lib/reddit/Media";
import { combine } from "$lib/server/ffmpeg/Combine";
import { cache } from "$lib/server/cache/";
import { range } from "$lib/server/Range";
import { query } from "$lib/reddit/server";
import { env } from "$env/dynamic/private";
import { error, redirect } from "@sveltejs/kit";

const CONTENT_TTL = +(env.CACHE_VIDEO_TTL ?? 3600);
const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

type OkCachedResponse = {
  status: 200,
  content: Uint8Array<ArrayBuffer>,
  mime: string,
  filename: string,
}

type RedirectCachedResponse = {
  status: 301 | 302 | 303 | 307 | 308,
  location: string,
}

type ErrorCachedResponse = {
  status: number,
  message: string
}

type CachedResponse = OkCachedResponse | RedirectCachedResponse | ErrorCachedResponse;

export const GET: RequestHandler = async ({ url, params, fetch, request }) => {
  const mediaId = url.searchParams.get('media');
  const { post, collection } = await query({ permalink: params.permalink, fetch });

  const response = await cache().getSet<CachedResponse>([ 'GET', url.pathname, mediaId ?? '' ], async () => {
    console.log({ collection, filtered: collection.filter(m => !mediaId || m.id === mediaId) })
    const variants = collection.filter(m => !mediaId || m.id === mediaId).flatMap(m => m.variants)
      .filter(
        v => v.type === VariantType.Video
          || v.type === VariantType.PartialVideo
          || v.type === VariantType.PartialAudio
      );

    const biggestVariant = findBiggestVariant(variants);
    if (!biggestVariant) {
      return {
        status:  404,
        message: 'No applicable variant found',
      } as ErrorCachedResponse;
    }

    // Partial videos need to be combined
    if (biggestVariant.type === VariantType.PartialVideo) {
      const video = biggestVariant;
      const audio = variants.find(m => m.type === VariantType.PartialAudio);
      if (audio) {
        const buffer = await combine({
          videoPath: video.href,
          audioPath: audio.href,
        });

        return {
          status:   200,
          content:  buffer,
          mime:     'video/mp4',
          filename: `${post.id}-${video.id}.mp4`,
        } as OkCachedResponse;
      }
    }

    // Otherwise, use the best gif or whatever we have as a fallback
    const { href } = biggestVariant;
    const response = await fetch(href, {
      redirect: 'follow',
      headers:  { 'origin': 'reddit.com', 'User-Agent': UserAgent }
    });

    if (response.status !== 200) {
      return {
        status:  response.status,
        message: `Failed to fetch media from ${href}`,
      } as ErrorCachedResponse;
    }

    // It's unclear if we actually need to cache this or if we can just store zero bytes, forcing new requests.
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      status:   200,
      content:  bytes,
      mime:     response.headers.get('Content-Type') ?? 'video/mp4',
      filename: `${post.id}-${biggestVariant.id}.mp4`,
    } as OkCachedResponse;
  }, CONTENT_TTL);

  if (response.status !== 200 || 'message' in response) {
    if ('location' in response) {
      return redirect(response.status, response.location);
    } else if ('message' in response) {
      return error(response.status, response.message)
    } else {
      return error(500, 'Unknown error has occurred while parsing cached results')
    }
  }

  // Prepare the content and try to do a range for iOS playback
  let status = 200;
  let { content, mime, filename } = response;
  let headers = {
    "Content-Type":        mime,
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control":       "public, max-age=3600",
  }

  const slice = range(request, content);
  if (slice) {
    content = slice.slice;
    status = slice.status;
    headers = {
      ...headers,
      ...slice.headers,
    }
  }

  return new Response(content, { status, headers });
};