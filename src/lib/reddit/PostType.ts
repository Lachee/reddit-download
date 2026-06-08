import type { Post } from "$lib/reddit/schema/postSchema";
import { type Media, type QueryableMedia, VariantType } from "$lib/reddit/Media";

export enum PostType {
  Video   = 'video',
  GIF     = 'gif',
  Image   = 'image',
  Gallery = 'gallery',
  Text    = 'text',
}


export function getPostType(post: Post, collections: (Media | QueryableMedia)[]): PostType {
  let type = PostType.Text;
  if (collections.some(c => c.type === 'secure_video' || c.type === 'preview_video')
    || collections.some(c => 'variants' in c && c.variants.some(m => m.type === VariantType.Video))) {
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