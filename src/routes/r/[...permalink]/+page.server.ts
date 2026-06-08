import type { PageServerLoad } from './$types';
import { getPostType } from "$lib/reddit/PostType";
import { query } from "$lib/reddit/server";

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { post, collection } = await query({ permalink: params.permalink, fetch });
  const type = getPostType(post, collection);
  return {
    post,
    type,
    collection
  };
};