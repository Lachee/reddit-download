import type { PageServerLoad } from 'types/src/routes';
import { fetchPost } from "$lib/reddit/server/Post";


export const load: PageServerLoad = async ({ params, fetch }) => {
  return {
    post: fetchPost(fetch, `r/${params.path}`)
  };
};