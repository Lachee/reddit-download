import type { RequestHandler } from './$types';
import { findBiggestVariant, findSmallestVariant, VariantType } from "$lib/reddit/Media";
import { cache } from "$lib/server/cache";
import type { Cacheable } from "$lib/server/cache/Cache";
import { range } from "$lib/server/Range";
import { query } from "$lib/reddit/server";
import { env } from "$env/dynamic/private";


const CONTENT_TTL = +(env.CACHE_IMAGE_TTL ?? 3600);
const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

interface CachedResponse extends Cacheable {
  content: Uint8Array<ArrayBuffer>,
  mime: string,
  filename: string,
  status: number,
}

export const trailingSlash = 'always';

/** Gets an Image (anything that can go in a <img>) from a given post
 * @query-param media The ID of the specific media in the post's collection to fetch
 * @query-param size The size of the image to fetch. It will try to find the closest matching image. Defaults to 'best'.
 * - 'best' will return the best image available
 * - 'thumbnail' will return the smallest image available
 * - '<px value>' will return the image with the closest width to the given value
 */
export const GET: RequestHandler = async ({ url, params, fetch, request }) => {
  const mediaId = url.searchParams.get('media') ?? url.searchParams.get('m') ?? false;
  const size = url.searchParams.get('size') ?? url.searchParams.get('s') ?? 'best';
  const { post, collection } = await query({ permalink: params.permalink, fetch });

  const cached = await cache().getSet<CachedResponse>([ 'GET', url.pathname, mediaId, size ], async () => {
    const variants = collection
      .filter(m => mediaId === false || m.id === mediaId)
      .flatMap(m => m.variants)
      .filter(m => m.type === VariantType.Image || m.type === VariantType.GIF)

    // Find the best available image
    const best = size === 'best'
                 ? findBiggestVariant(variants)
                 : size === 'thumbnail'
                   ? findSmallestVariant(variants)
                   : variants.find(m => m.dimension?.width === +size);

    const { href, dimension } = best ?? variants[0];

    console.log("Fetching media from", href, dimension)
    const response = await fetch(href, {
      redirect: 'follow',
      headers:  { 'origin': 'reddit.com', 'User-Agent': UserAgent }
    });

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