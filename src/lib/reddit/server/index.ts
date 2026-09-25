import { fetchPost } from "$lib/reddit/server/Post";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { getCommentMediaCollection, getMediaCollection, queryMediaCollection } from "$lib/reddit/server/Media";
import type { Post } from "$lib/reddit/schema/postSchema";
import type { Comment } from "$lib/reddit/schema/commentSchema";
import { cache } from "$lib/server/cache";
import type { Cacheable } from "$lib/server/cache/Cache";
import { env } from "$env/dynamic/private"
import type { MediaCollection } from "$lib/reddit/Media";
import { error } from "@sveltejs/kit";

export type MediaResult = Cacheable & {
  normalized: string,
  post: Post,
  comment?: Comment,
  collection: MediaCollection,
}

export type QueryResult = MediaResult & {
  permalink: string,
}

export type QueryOpts = {
  permalink: string
  ttl?: number
  fetch: typeof window.fetch
}

type CachedResult = MediaResult | { error: { message: string } | { status: number, body: string } };

/** Queries the permalink and returns the post and media collection. */
export async function query({
                              permalink,
                              ttl = +(env.CACHE_POST_TTL ?? 604800),
                              fetch = window.fetch,
                            }: QueryOpts): Promise<QueryResult> {
  const normalized = normalizePermalink(permalink);
  const postQuery = async (): Promise<CachedResult> => {
    try {
      const { post, comment } = await fetchPost(fetch, normalized);
      const commentMedia = comment ? getCommentMediaCollection(comment) : [];
      const hasCommentMedia = commentMedia.length > 0;
      const collection = await queryMediaCollection(fetch, hasCommentMedia ? commentMedia : getMediaCollection(post))
      return {
        normalized,
        post,
        comment: hasCommentMedia ? comment : undefined,
        collection
      } satisfies CachedResult;
    } catch (error: any) {
      return { error } satisfies CachedResult;
    }
  };

  let result: CachedResult;
  if (ttl === undefined || ttl < 0) {
    result = await postQuery();
  } else {
    result = await cache().getSet([ 'QUERY', 'post', normalized ], postQuery, ttl);
  }

  // Handle errors thrown by the query.
  // It can be either a HTTP error or something else.
  if ('error' in result) {
    if ('status' in result.error && 'body' in result.error)
      throw error(result.error.status, result.error.body)
    else
      throw error(500, result.error.message);
  }

  return {
    ...result,
    permalink: normalizePermalink(result.comment?.permalink ?? result.post.permalink),
  };
}
