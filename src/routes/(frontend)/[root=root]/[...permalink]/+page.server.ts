import type { PageServerLoad } from './$types';
import { getCommentType, getPostType } from "$lib/reddit/PostType";
import { query } from "$lib/reddit/server";
import { normalizePermalink } from "$lib/reddit/Utilities";

const link = (url : URL|string, rel = 'preload', as = 'image', priority = 'auto') : string => `<${url}>; rel=${rel}; as=${as}; fetchpriority="${priority}"`;

export const load: PageServerLoad = async ({ setHeaders, params, fetch }) => {
  const permalink = normalizePermalink(`${params.root}/${params.permalink}`);
  const result = await query({ permalink, fetch });
  const { post, comment, collection } = result;
  const type = comment ? getCommentType(collection) : getPostType(post, collection);

  // const links = [
  //   ...collection.map(m =>  link(`/i/${toMediaPath(post.permalink)}?m=${m.id}&s=thumbnail`, 'preload', 'image', 'high')),
  // ];
  //
  // setHeaders({
  //   Link: links.join(', ')
  // })

  return {
    post,
    comment,
    permalink: result.permalink,
    type,
    collection
  };
};
