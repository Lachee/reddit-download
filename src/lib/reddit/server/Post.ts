import { z } from 'zod';
import { authenticate } from "$lib/reddit/server/Authentication";
import postSchema, { type Post } from "$lib/reddit/schema/postSchema";
import { follow } from "$lib/reddit/server/Links";
import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

const ALLOW_NSFW = (env.ALLOW_NSFW ?? '').toLowerCase() === 'true';
const DENY_SUBREDDITS = (env.DENY_SUBREDDITS ?? '').split(',').map(s => s.trim());

const matchSubreddit = (pattern: string, subreddit: string) => {
  return pattern.toLowerCase() === subreddit.toLowerCase();
}

const thingSchema = z.object({
  kind: z.string(),
  data: z.unknown(),
}).loose();

const listingSchema = z.object({
  kind: z.literal('Listing'),
  data: z.object({
    after:    z.string().nullable().optional(),
    before:   z.string().nullable().optional(),
    children: z.array(thingSchema),
  }).loose(),
}).loose();

export const postResponseSchema = z.array(listingSchema)

export async function fetchPost(fetch: typeof window.fetch, path: string): Promise<Post> {
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

  if (response.status === 404)
    throw error(404, 'NOT_FOUND: The post could not be found.');

  if (response.status !== 200)
    throw error(response.status, "BAD_RESPONSE: Reddit responded with a bad status code. " + response.statusText);

  // Reddit for some reason breaks the node Response.json().
  const text = await response.text();
  const json = JSON.parse(text);
  const validation = postResponseSchema.safeParse(json);
  if (!validation.success)
    throw error(500, 'BAD_RESPONSE: Reddit responded with an invalid response.');

  // Find the first listing child that is a post
  let post: Post | undefined;
  for (const listing of validation.data) {
    for (const child of listing.data.children) {
      if (child.kind === 't3') {
        if (
          typeof child.data === 'object' && child.data
          && 'crosspost_parent_list' in child.data && child.data.crosspost_parent_list !== null
          && Array.isArray(child.data.crosspost_parent_list) && child.data.crosspost_parent_list.length > 0) {
          post = postSchema.parse(child.data.crosspost_parent_list[0]);
        } else {
          post = postSchema.parse(child.data);
        }
        break;
      }
    }
  }


  if (post === undefined || post === null)
    throw error(404, 'NOT_FOUND: The post could not be found.');

  // Ensure the post is not NSFW if we do not allow it
  if (!ALLOW_NSFW && post.over_18)
    throw error(403, 'DENY_NSFW: The post is NSFW and NSFW posts are not allowed.');

  // Ensure the post is not in the deny listed subreddit
  if (DENY_SUBREDDITS.some(pattern => matchSubreddit(pattern, post.subreddit)))
    throw error(403, 'DENY_SUBREDDIT: The post is in a subreddit that is not allowed.')

  return post;
}