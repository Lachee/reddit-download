import type { PageServerLoad } from './$types';
import { getPostType } from "$lib/reddit/PostType";
import { query } from "$lib/reddit/server";
import { normalizePermalink } from "$lib/reddit/Utilities";

export const load: PageServerLoad = async ({ setHeaders, params, fetch }) => {
  const { post, collection } = await query({ permalink: params.permalink, fetch });
  const type = getPostType(post, collection);

  const thumbnailLink = `/i/${normalizePermalink(post.permalink).substring(2)}?media=thumbnail`

  setHeaders({
    Link: [
      `<${(thumbnailLink)}>; rel=preload; as=image; fetchpriority="high"`
    ].join(', ')
  })

  return {
    post,
    type,
    collection
  };
};