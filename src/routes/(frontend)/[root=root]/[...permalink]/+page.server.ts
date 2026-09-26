import type { PageServerLoad } from './$types';
import { getCommentType, getPostType } from "$lib/reddit/PostType";
import { query } from "$lib/reddit/server";
import { normalizePermalink } from "$lib/reddit/Utilities";
import { getOembedProvider } from "$lib/reddit/server/third-party";

const link = (url : URL|string, rel = 'preload', as = 'image', priority = 'auto') : string => `<${url}>; rel=${rel}; as=${as}; fetchpriority="${priority}"`;

export const load: PageServerLoad = async ({ setHeaders, params, fetch }) => {
  const permalink = normalizePermalink(`${params.root}/${params.permalink}`);
  const result = await query({ permalink, fetch });
  const { post, comment, collection } = result;
  const type = comment ? getCommentType(collection) : getPostType(post, collection);

  // Mirrors getMediaCollection, which only uses the oembed when there is no reddit video or comment media.
  const oembed = post.secure_media?.reddit_video ? undefined : post.secure_media?.oembed;
  const provider = !comment && oembed ? getOembedProvider(oembed) : undefined;

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
    provider,
    collection
  };
};
