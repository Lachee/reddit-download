import type { PageServerLoad } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { getMediaCollection, Variant } from "$lib/reddit/server/Media";
import { getPostType, PostType } from "$lib/reddit/PostType";

export const load: PageServerLoad = async ({ params, fetch }) => {
  const post = await fetchPost(fetch, normalizePermalink(params.permalink));
  const collections = getMediaCollection(post);
  return {
    post,
    type: getPostType(post, collections),
  };
};