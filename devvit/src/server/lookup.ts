import type { Comment, Post } from '@devvit/web/server';

/** The parts of the Devvit reddit client the lookup needs. */
export type RedditReader = {
  getPostById(id: `t3_${string}`): Promise<Post>;
  getCommentById(id: `t1_${string}`): Promise<Comment>;
};

export type LookupRequest = {
  /** Post to look up, with or without the t3_ prefix. */
  postId: string,
  /** Optional comment to look up, with or without the t1_ prefix. */
  commentId?: string,
};

export type SerializedPost = ReturnType<Post['toJSON']> & {
  gallery: Post['gallery'],
};

export type SerializedComment = ReturnType<Comment['toJSON']>;

export type LookupResponse = {
  post: SerializedPost,
  /** The original post when `post` is a crosspost. */
  crosspostParent?: SerializedPost,
  comment?: SerializedComment,
};

/** An error with the HTTP status the external endpoint should respond with. */
export class LookupError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const ID = /^[a-z0-9]{1,16}$/i;

/** Validates the request body and returns the prefixed thing ids. */
export function parseLookupRequest(body: unknown): { postId: `t3_${string}`, commentId?: `t1_${string}` } {
  if (typeof body !== 'object' || body === null)
    throw new LookupError(400, 'Expected a JSON object body.');

  const { postId, commentId } = body as Partial<Record<keyof LookupRequest, unknown>>;
  const post = typeof postId === 'string' ? postId.replace(/^t3_/i, '') : '';
  if (!ID.test(post))
    throw new LookupError(400, 'postId must be a post id, eg 1ty68vr or t3_1ty68vr.');

  if (commentId === undefined || commentId === null)
    return { postId: `t3_${post}` };

  const comment = typeof commentId === 'string' ? commentId.replace(/^t1_/i, '') : '';
  if (!ID.test(comment))
    throw new LookupError(400, 'commentId must be a comment id, eg pbo3njw or t1_pbo3njw.');

  return { postId: `t3_${post}`, commentId: `t1_${comment}` };
}

function serializePost(post: Post): SerializedPost {
  return { ...post.toJSON(), gallery: post.gallery };
}

/** Devvit throws a plain Error with "no post"/"no comment" when /api/info returns nothing. */
function isMissing(err: unknown): boolean {
  return err instanceof Error && /\bno (post|comment)\b|not found/i.test(err.message);
}

async function read<T>(thing: string, get: () => Promise<T>): Promise<T> {
  try {
    return await get();
  } catch (err) {
    if (isMissing(err))
      throw new LookupError(404, `${thing} could not be found. It may be deleted, removed or in a private subreddit.`);
    throw err;
  }
}

/** A missing comment isn't fatal, the post is still shown like it is on the site's .json path. */
async function readComment(reddit: RedditReader, postId: `t3_${string}`, commentId: `t1_${string}`): Promise<Comment | undefined> {
  try {
    const comment = await read(commentId, () => reddit.getCommentById(commentId));
    if (comment.postId === postId)
      return comment;
    console.warn(`[lookup] ${commentId} is not a comment on ${postId}`);
  } catch (err) {
    if (!(err instanceof LookupError))
      throw err;
    console.warn(`[lookup] ${err.message}`);
  }
  return undefined;
}

/** Looks up the post (and comment) as the app account. */
export async function lookup(reddit: RedditReader, body: unknown): Promise<LookupResponse> {
  const { postId, commentId } = parseLookupRequest(body);

  const [ post, comment ] = await Promise.all([
    read(postId, () => reddit.getPostById(postId)),
    commentId ? readComment(reddit, postId, commentId) : undefined,
  ]);

  const response: LookupResponse = { post: serializePost(post) };
  if (comment)
    response.comment = comment.toJSON();

  // The crosspost holds no media of its own, so the original is needed too.
  // A deleted original is not fatal, the crosspost is still returned.
  if (post.crosspostParentId) {
    try {
      response.crosspostParent = serializePost(await reddit.getPostById(post.crosspostParentId));
    } catch (err) {
      console.warn(`[lookup] could not read crosspost parent ${post.crosspostParentId} of ${postId}:`, err);
    }
  }

  return response;
}
