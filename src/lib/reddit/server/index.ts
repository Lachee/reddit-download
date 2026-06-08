import { fetchPost } from "$lib/reddit/server/Post";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { getMediaCollection, type MediaCollection, queryMediaCollection } from "$lib/reddit/server/Media";
import type { Post } from "$lib/reddit/schema/postSchema";
import { cache } from "$lib/server/cache";
import type { Cacheable } from "$lib/server/cache/Cache";
import { env } from "$env/dynamic/private"

export type MediaResult = Cacheable & {
  normalized: string,
  post: Post,
  collection: MediaCollection,
}

export type QueryOpts = {
  permalink: string
  ttl?: number
  fetch: typeof window.fetch
}

/** Queries the permalink and returns the post and media collection. */
export async function query({
                              permalink,
                              ttl = +(env.CACHE_POST_TTL ?? 604800),
                              fetch = window.fetch,
                            }: QueryOpts): Promise<MediaResult> {
  const normalized = normalizePermalink(permalink);
  const postQuery = async () => {
    const post = await fetchPost(fetch, normalized);
    const collection = await queryMediaCollection(fetch, getMediaCollection(post))
    return {
      normalized,
      post,
      collection
    } satisfies MediaResult;
  };

  if (ttl === undefined || ttl < 0)
    return await postQuery();

  return await cache().getSet([ 'QUERY', 'post', normalized ], postQuery, ttl);
}
