import type { PageServerLoad } from './$types';
import { getPostType } from "$lib/reddit/PostType";
import { query } from "$lib/reddit/server";
import { normalizePermalink } from "$lib/reddit/Utilities";


export const load: PageServerLoad = async ({ setHeaders, params, fetch }) => {
  const permalink = normalizePermalink(params.permalink);
  const share = query({  permalink, fetch });
  return {
    permalink,
    share
  }
};