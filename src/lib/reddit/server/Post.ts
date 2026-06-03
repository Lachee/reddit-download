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

export const postResponseSchema = z
  .array(listingSchema)
  .min(1)
  .transform((listings) => {
    const firstListing = listings[0];
    const firstChild = firstListing.data.children[0];
    if (!firstChild || firstChild.kind !== 't3') {
      throw new Error('Reddit response did not contain a post as the first child');
    }

    return postSchema.parse({
      kind: firstChild.kind,
      ...(firstChild.data as object),
    });
  });

export async function fetchPost(fetch: typeof window.fetch, path: string) : Promise<Post> {
  const { access_token } = await authenticate(fetch);

  console.log('Looking up post ', path);
  const {  pathname  } = await follow(fetch, path);
  const url = new URL(`${pathname}.json?raw_json=1`,'https://oauth.reddit.com');

  console.log('Fetching post from:', url.toString());
  const response = await fetch(url, {
    method:  'GET',
    redirect: 'error',
    headers: {
      'User-Agent':    USER_AGENT,
      'Authorization': `Bearer ${access_token}`
    }
  })

  if (response.status !== 200)
    throw new Error('Failed to fetch post: ' + response.status + " " + response.statusText)


  return await response.json().then(postResponseSchema.parse);
}