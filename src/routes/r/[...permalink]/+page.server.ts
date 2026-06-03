import type { PageServerLoad } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import { fetchMedia, sort } from "$lib/reddit/server/Media";
import { normalizePermalink } from "$lib/reddit/Utilities";


export const load: PageServerLoad = async ({ params, fetch }) => {
  const post = await fetchPost(fetch, normalizePermalink(params.permalink));
  const media = await fetchMedia(post).then(sort)
  return {
    post,
    media
  };
};