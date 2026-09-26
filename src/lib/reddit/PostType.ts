import type { Post } from "$lib/reddit/schema/postSchema";
import { type Media, MediaType, type QueryableMedia, VariantType } from "$lib/reddit/Media";

export enum PostType {
  Video   = 'video',
  GIF     = 'gif',
  Image   = 'image',
  Gallery = 'gallery',
  Text    = 'text',
}


export function getPostType(post: Post, collections: (Media | QueryableMedia)[]): PostType {
  const linked = collections.filter(c => c.type === MediaType.Linked);
  let type = PostType.Text;
  if (collections.some(c => c.type === 'secure_video' || c.type === 'preview_video')
    || collections.some(c => 'variants' in c && c.variants.some(m => m.type === VariantType.Video))) {
    type = PostType.Video;
  } else if (post.gallery_data || (post.media_metadata && Object.keys(post.media_metadata).length > 1) || linked.length > 1) {
    type = PostType.Gallery;
  } else if (post.url?.endsWith('.gif') || post.url?.endsWith('.gifv') || linked.some(c => c.variants.some(v => v.type === VariantType.GIF))) {
    type = PostType.GIF;
  } else if (post.post_hint === 'image' || linked.length > 0) {
    type = PostType.Image;
  }

  return type;
}

export function getCommentType(collection: Media[]): PostType {
  if (collection.some(c => c.type === MediaType.CommentVideo))
    return PostType.Video;
  if (collection.length > 1)
    return PostType.Gallery;
  if (collection.some(c => c.variants.some(v => v.type === VariantType.GIF)))
    return PostType.GIF;
  return PostType.Image;
}
