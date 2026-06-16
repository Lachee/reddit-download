import type { RequestHandler } from './$types';
import { findBiggestVariant, findSmallestVariant, MediaType, VariantType } from "$lib/reddit/Media";
import { cache } from "$lib/server/cache/";
import type { Cacheable } from "$lib/server/cache/Cache";
import { range } from "$lib/server/Range";
import { query } from "$lib/reddit/server";
import { env } from "$env/dynamic/private";

export const trailingSlash = 'always';

const CONTENT_TTL = +(env.CACHE_IMAGE_TTL ?? 3600);
const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

interface CachedResponse extends Cacheable {
  content: Uint8Array<ArrayBuffer>,
  mime: string,
  filename: string,
  status: number,
}

export const GET: RequestHandler = async ({ url, params, fetch, request }) => {
  // Return the cached response if it exists / is currently being processed
  const mediaId = url.searchParams.get('media');
  const { post, collection } = await query({ permalink: params.permalink, fetch });

  const cached = await cache().getSet<CachedResponse>([ 'GET', url.pathname, mediaId ?? '' ], async () => {
    const variants = mediaId === 'thumbnail'
                     ? collection.flatMap(m => m.variants)
                     : collection.filter(m => !mediaId || m.id === mediaId).flatMap(m => m.variants)

    // Find the best available image and video
    // We will determine if we should convert the video to a image by checking if the video is wider than the image.
    const best = mediaId === 'thumbnail'
                                  ? findSmallestVariant(variants)
                                  : findBiggestVariant(variants.filter(m => m.type === VariantType.Image || m.type === VariantType.GIF))

    const { href } = best ?? variants[0];
    const response = await fetch(href, {
      redirect: 'follow',
      headers:  { 'origin': 'reddit.com', 'User-Agent': UserAgent }
    });

    console.log("Fetching media", response.headers.get('Content-Type'));
    const mime = response.headers.get('Content-Type') ?? 'image/jpg';
    const poorlyExtrapolatedFileExtension = mime.split('/')[1];
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      content:  bytes,
      mime:     response.headers.get('Content-Type') ?? 'image/jpg',
      filename: `${post.id}-${(best ?? variants[0]).id}.${poorlyExtrapolatedFileExtension}`,
      status:   response.status,
    } satisfies CachedResponse;
  }, CONTENT_TTL);


  // Prepare the content and try to do a range for iOS playback
  let content = cached.content;
  let status = cached.status;
  let headers: Record<string, string> = {
    "Content-Type":        cached.mime,
    "Content-Disposition": `inline; filename="${cached.filename}"`,
    "Cache-Control":       "public, max-age=3600",
  }

  const slice = range(request, cached.content);
  if (slice) {
    content = slice.slice;
    status = slice.status;
    headers = {
      ...headers,
      ...slice.headers,
    }
  }

  return new Response(content, { status, headers });
}