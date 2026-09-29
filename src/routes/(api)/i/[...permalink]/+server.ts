import type { RequestHandler } from './$types';
import { findBiggestVariant, findClosestToSize, findEmbeddedMedia, findSmallestVariant, MediaType, VariantType } from "$lib/reddit/Media";
import { cache } from "$lib/server/cache";
import type { Cacheable } from "$lib/server/cache/Cache";
import { range } from "$lib/server/Range";
import { query } from "$lib/reddit/server";
import { env } from "$env/dynamic/private";
import { dev } from '$app/environment'
import { error } from "@sveltejs/kit";
import { generateMoreThumbnail, generateThumbnail } from "$lib/server/ffmpeg/GenerateThumbnail";
import { RootMediaId } from "$lib/reddit/server/Media";


const CONTENT_TTL = +(env.CACHE_IMAGE_TTL ?? 3600);
const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

type CachedResponse = Cacheable & ({
  content: Uint8Array<ArrayBuffer>,
  mime: string,
  filename: string,
  status: number,
} | {  status: number, error: string })

export const trailingSlash = 'always';

/** Gets an Image (anything that can go in a <img>) from a given post
 * @query-param media The ID of the specific media in the post's collection to fetch
 * @query-param size The size of the image to fetch. It will try to find the closest matching image. Defaults to 'best'.
 * - 'best' will return the best image available
 * - 'thumbnail' will return the smallest image available
 * - '<px value>' will return the image with the closest width to the given value
 * @query-param more Renders the image as a blurred square labelled "+<more>". Must not exceed the number of media in the post.
 */
export const GET: RequestHandler = async ({ url, params, request }) => {
  const mediaId = url.searchParams.get('media') ?? url.searchParams.get('m') ?? false;
  const size = url.searchParams.get('size') ?? url.searchParams.get('s') ?? 'best';
  const more = Math.max(0, Math.floor(+(url.searchParams.get('more') ?? 0) || 0));
  const cacheBust = dev ? url.searchParams.get('v') ?? '' : '';
  const { post, collection } = await query({ permalink: params.permalink, fetch });

  if (more < 0 || (more > 0 && more > findEmbeddedMedia(collection).length))
    return error(400, 'invalid range for more');

  const cached = await cache().getSet<CachedResponse>([ 'GET', url.pathname, mediaId, size + cacheBust, more], async () => {
    const filterOutThumbnails = collection.some(m => m.type === MediaType.PreviewImage);
    const variants = collection
      .filter(m => mediaId === RootMediaId || mediaId === false || m.id === mediaId) // Filter for the image we care about
      .filter(m => !filterOutThumbnails || m.type !== MediaType.Thumbnail) // Filter out thumbnails if we can
      .flatMap(m => m.variants)

    // Find the best available image
    let best = size === 'best'
                 ? findBiggestVariant(variants)
                 : size === 'thumbnail'
                   ? findSmallestVariant(variants)
                   : findClosestToSize(variants, +size)

    // We dont have an image, so lets generate one.
    if (best === undefined || best.type === VariantType.Video || best.type === VariantType.PartialVideo) {
      console.log(`[image] ${post.id}/${mediaId || 'all'} has no ${size} image, generating a thumbnail from its video instead`)
      let video = collection
        .filter(m => mediaId === RootMediaId || mediaId === false || m.id === mediaId)
        .filter(m => m.type === MediaType.SecureVideo || m.type === MediaType.CommentVideo)
        .flatMap(m => m.variants)
        .filter(v => v.type === VariantType.PartialVideo || v.type === VariantType.Video)[0];

      if (video) {
        const thumb = more > 0
          ? await generateMoreThumbnail({ videoPath: video.href, more })
          : await generateThumbnail({
            videoPath: video.href,
            scale:     size === 'thumbnail' ? 108 : -2 // NOTE: We specifically dont scale to the `size` as that is unvalidated user input.
          });

        return {
          status:   200,
          content:  thumb,
          mime:     'image/jpeg',
          filename: `${post.id}-${video.id}-thumbnail.jpeg`
        } satisfies CachedResponse;
      }
    }

    // We really dont have a image so we should throw an error
    if (!best)
      return { status: 404, error: 'No image available.'}

    const { href, dimension } = best;
    if (more > 0) {
      return {
        status:   200,
        content:  await generateMoreThumbnail({ videoPath: href, seconds: 0, more }),
        mime:     'image/jpeg',
        filename: `${post.id}-${best.id}-more.jpeg`
      } satisfies CachedResponse;
    }

    console.log(`[image] serving ${size} image for ${post.id}/${mediaId || 'all'} (${dimension?.width ?? '?'}x${dimension?.height ?? '?'}) from ${href}`)
    const response = await fetch(href, {
      headers:  { 'origin': 'reddit.com', 'User-Agent': UserAgent }
    });

    const status = response.status;
    const mime = response.headers.get('Content-Type') ?? 'image/jpg';
    const poorlyExtrapolatedFileExtension = mime.split('/')[1];
    const content = new Uint8Array(await response.arrayBuffer());
    const filename = `${post.id}-${(best ?? variants[0]).id}.${poorlyExtrapolatedFileExtension}`
    return {
      status,
      content,
      mime,
      filename
    } satisfies CachedResponse;
  }, CONTENT_TTL);

  if ('error' in cached)
    return error(cached.status, cached.error);

  // Prepare the content and try to do a range for iOS playback
  let content = cached.content;
  let status = cached.status;
  let headers: Record<string, string> = {
    "Content-Type":        cached.mime,
    "Content-Disposition": `attachment; filename="${cached.filename}"`,
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