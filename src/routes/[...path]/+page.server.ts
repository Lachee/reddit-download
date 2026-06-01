import type { PageServerLoad } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";


export const load: PageServerLoad = async ({ params, fetch }) => {
  return {
    post: fetchPost(fetch, params.path)
  };
};