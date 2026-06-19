import type { PageServerLoad } from './$types';
import { getPostType } from "$lib/reddit/PostType";
import { query } from "$lib/reddit/server";
import { normalizePermalink } from "$lib/reddit/Utilities";

const link = (url : URL|string, rel = 'preload', as = 'image', priority = 'auto') : string => `<${url}>; rel=${rel}; as=${as}; fetchpriority="${priority}"`;

export const load: PageServerLoad = async ({ setHeaders, params, fetch }) => {
  const { post, collection } = await query({ permalink: params.permalink, fetch });
  const type = getPostType(post, collection);

  // const links = [
  //   ...collection.map(m =>  link(`/i/${normalizePermalink(post.permalink).substring(2)}?media=${m.id}&size=thumbnail`, 'preload', 'image', 'high')),
  // ];
  //
  // setHeaders({
  //   Link: links.join(', ')
  // })

  return {
    post,
    type,
    collection
  };
};