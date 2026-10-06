import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import { getCommentId } from "$lib/reddit/Utilities";
import { NOT_FOUND } from "$lib/Errors";
import type { Post } from "$lib/reddit/schema/postSchema";
import type { Comment } from "$lib/reddit/schema/commentSchema";
import { lookupErrorSchema, lookupResponseSchema } from "./schema";
import { toComment, toPost } from "./convert";

const USER_AGENT = 'node:com.lachee.redditclient:v0.1.0 (by /u/Lachee)';
const LOOKUP_PATH = '/external/lookup';

/** Post ids from /r/sub/comments/<id>/..., /user/name/comments/<id>/... and /gallery/<id>. */
const POST_ID = /^(?:\/(?:r|u|user)\/[^/]+)?\/(?:comments|gallery)\/([a-z0-9]+)/i;

/** Devvit is used to read posts whenever the app's external endpoint is configured. */
export function isDevvitConfigured(): boolean {
  return !!env.DEVVIT_URL && !!env.DEVVIT_TOKEN;
}

/** The lookup endpoint on the install, eg https://dltool-2th52-external.devvit.net/external/lookup */
function lookupUrl(): URL {
  try {
    return new URL(LOOKUP_PATH, env.DEVVIT_URL);
  } catch {
    throw new Error(`DEVVIT_URL is not a valid URL: ${env.DEVVIT_URL}`);
  }
}

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  try {
    return lookupErrorSchema.parse(JSON.parse(text)).error;
  } catch {
    return text || response.statusText;
  }
}

/** Reads the post (and comment) at the pathname through the dltool Devvit app. */
export async function fetchDevvitThread(fetch: typeof window.fetch, pathname: string): Promise<{ post: Post, comment?: Comment }> {
  const postId = pathname.match(POST_ID)?.[1];
  if (!postId)
    throw error(404, NOT_FOUND + ': The link does not point to a post.');

  const commentId = getCommentId(pathname);

  console.log(`[devvit] looking up post ${postId}${commentId ? ` comment ${commentId}` : ''}`);
  const response = await fetch(lookupUrl().toString(), {
    method:  'POST',
    headers: {
      'User-Agent':    USER_AGENT,
      'Content-Type':  'application/json',
      'Authorization': `bearer ${env.DEVVIT_TOKEN}`,
    },
    body:    JSON.stringify({ postId, commentId }),
  });

  if (response.status === 404)
    throw error(404, NOT_FOUND + ': ' + await readError(response));

  if (response.status === 401 || response.status === 403) {
    console.error(`[devvit] lookup was refused (${response.status}), check DEVVIT_URL and DEVVIT_TOKEN: ${await readError(response)}`);
    throw error(502, 'BAD_RESPONSE: The Devvit app refused the request.');
  }

  if (response.status === 429)
    throw error(429, 'BAD_RESPONSE: Too many requests to the Devvit app, try again soon.');

  if (response.status !== 200) {
    const message = await readError(response);
    console.warn(`[devvit] lookup of ${postId} failed: ${response.status} ${message}`);
    throw error(502, `BAD_RESPONSE: The Devvit app responded with ${response.status}. ${message}`);
  }

  const validation = lookupResponseSchema.safeParse(await response.json());
  if (!validation.success) {
    console.error(`[devvit] lookup of ${postId} did not match the expected schema:`, validation.error.issues);
    throw error(500, 'BAD_RESPONSE: The Devvit app responded with an invalid response.');
  }

  // Crossposts present the original post, same as crosspost_parent_list on the .json endpoint.
  const { post, crosspostParent, comment } = validation.data;
  return {
    post:    toPost(crosspostParent ?? post),
    comment: comment ? toComment(comment) : undefined,
  };
}
