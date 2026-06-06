import type { RequestHandler } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import {
  getMediaCollection,
  type Media,
  type Variant,
  VariantType
} from "$lib/reddit/server/Media";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { cache } from "$lib/cache/";
import type { Cacheable } from "$lib/server/cache/Cache";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

interface CachedResponse extends Cacheable {
  body: Uint8Array<ArrayBuffer>,
  status: number,
  headers: Record<string, string>,
}

function findBestMedia(collection : Media[]) : Media {
  let bestMedia : Media = collection[0];
  let bestVariant : Variant = bestMedia.variants[0];
  for (const media of collection) {
    const variant = media.variants.find(v => v.type === VariantType.Image);
    if (variant && variant.dimension && bestVariant.dimension && variant.dimension.width > bestVariant.dimension.width) {
      bestMedia = media;
      bestVariant = variant;
    }
  }
  return bestMedia;
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
    const collection = getMediaCollection(post).filter(col => 'variants' in col);

    const media = mediaId
                 ? collection.find(col => col.id === mediaId)
                 : findBestMedia(collection);

    if (media === undefined)
      throw new Error('No media found');

    // Find the best available image and video
    // We will determine if we should convert the video to a image by checking if the video is wider than the image.
    const best = media.variants.find(m => m.type === VariantType.Image);
    const { href } = best ?? media.variants[0];
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