import { z } from 'zod';
import { authenticate } from "$lib/reddit/server/Authentication";
import postSchema, { type Post } from "$lib/reddit/schema/postSchema";
import { follow } from "$lib/reddit/server/Links";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

const thingSchema = z.object({
  kind: z.string(),
  data: z.unknown(),
}).loose();

const listingSchema = z.object({
  kind: z.literal('Listing'),
  data: z.object({
    after: z.string().nullable().optional(),
    before: z.string().nullable().optional(),
    children: z.array(thingSchema),
  }).loose(),
}).loose();

export const postResponseSchema = z.array(listingSchema)

export async function fetchPost(fetch: typeof window.fetch, path: string) : Promise<Post> {
  const { access_token } = await authenticate(fetch);
  const { pathname } = await follow(fetch, path);
  const url = new URL(`${pathname}.json?raw_json=1`, 'https://oauth.reddit.com');

  console.log('Fetching post from:', url.toString());
  const response = await fetch(url.toString(), {
    method:   'GET',
    redirect: 'follow',
    headers:  {
      'User-Agent':    USER_AGENT,
      'Authorization': `Bearer ${access_token}`
    }
  })

  if (response.status !== 200)
    throw new Error('Failed to fetch post: ' + response.status + " " + response.statusText)

  // Reddit for some reason breaks the node Response.json().
  const text = await response.text();
  const json = JSON.parse(text);
  const validation = postResponseSchema.safeParse(json);
  if (!validation.success) {
    console.error('Failed to parse post response:', validation.error.message, json);
    throw new Error('Failed to parse post response: ' + validation.error.message);
  }

  // Find the first listing child that is a post
  let post: Post | undefined;
  for(const listing of validation.data) {
    for (const child of listing.data.children) {
      if (child.kind === 't3') {
        post = child.data as Post;
        break;
      }
    }
  }


  if (post === undefined)
    throw new Error('Failed to find post in response');

  postSchema.parse(post);
  return post;
}