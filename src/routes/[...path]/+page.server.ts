import type { PageServerLoad } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import type { Post } from "$lib/reddit/schema/postSchema";
import { getMedia, type Media } from "$lib/reddit/server/Media";

async function loadPost(fetch: typeof window.fetch, path: string) : Promise<{  post: Post, media: Media[] }> {
  const post = await fetchPost(fetch, path);
  const media = await getMedia(post);
  console.log('Loaded post', post.id, 'with', media.length, 'media', { media, post });
  return {
    post,
    media
  }
}

export const load: PageServerLoad = async ({ params, fetch }) => {
  return {
    post: loadPost(fetch, params.path)
  };
};