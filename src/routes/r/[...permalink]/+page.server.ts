import type { PageServerLoad } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { getMediaCollection, queryMediaCollection } from "$lib/reddit/server/Media";
import { getPostType } from "$lib/reddit/PostType";

export const load: PageServerLoad = async ({ params, fetch }) => {
  const post = await fetchPost(fetch, normalizePermalink(params.permalink));
  const collection = await queryMediaCollection(fetch, getMediaCollection(post));
  const type = getPostType(post, collection);

  return {
    post,
    type,
    collection
  };
};