import type { Post } from "$lib/reddit/schema/postSchema";
import { type MediaCollection, type MediaCollectionQuery, Variant } from "$lib/reddit/server/Media";

export enum PostType {
  Video = 'video',
  GIF = 'gif',
  Image = 'image',
  Gallery = 'gallery',
  Text = 'text',
}


export function getPostType(post : Post, collections : (MediaCollection | MediaCollectionQuery)[]) : PostType {
  let type = PostType.Text;
  if (collections.some(c => c.name === 'secure_video' || c.name === 'preview_video')
    || collections.some(c => 'media' in c && c.media.some(m => m.variant === Variant.Video))) {
    type = PostType.Video;
  } else if (post.gallery_data || (post.media_metadata && Object.keys(post.media_metadata).length > 1)) {
    type = PostType.Gallery;
  } else if (post.url?.endsWith('.gif') || post.url?.endsWith('.gifv')) {
    type = PostType.GIF;
  } else if (post.post_hint === 'image') {
    type = PostType.Image;
  }

  return type;
}