import { describe, expect, it, vi } from 'vitest';
import type { Comment, Post } from '@devvit/web/server';
import { lookup, LookupError, parseLookupRequest, type RedditReader } from './lookup';

function fakePost(id: string, extra: Partial<Record<string, unknown>> = {}): Post {
  const json = { id, title: `Post ${id}`, permalink: `/r/test/comments/${id.slice(3)}/`, ...extra };
  return {
    ...json,
    gallery: [],
    toJSON: () => json,
  } as unknown as Post;
}

function fakeComment(id: string, postId: string): Comment {
  const json = { id, postId, body: 'hello', permalink: `/r/test/comments/${postId.slice(3)}/_/${id.slice(3)}/` };
  return { ...json, toJSON: () => json } as unknown as Comment;
}

function reader(posts: Post[], comments: Comment[] = []): RedditReader {
  return {
    getPostById: vi.fn(async (id) => {
      const post = posts.find(p => p.id === id);
      if (!post) throw new Error(`no post ${id}`);
      return post;
    }),
    getCommentById: vi.fn(async (id) => {
      const comment = comments.find(c => c.id === id);
      if (!comment) throw new Error(`no comment ${id}`);
      return comment;
    }),
  };
}

describe('parseLookupRequest', () => {
  it('prefixes bare ids', () => {
    expect(parseLookupRequest({ postId: '1ty68vr', commentId: 'pbo3njw' }))
      .toEqual({ postId: 't3_1ty68vr', commentId: 't1_pbo3njw' });
  });

  it('keeps prefixed ids', () => {
    expect(parseLookupRequest({ postId: 't3_1ty68vr' })).toEqual({ postId: 't3_1ty68vr' });
  });

  it.each([
    null,
    'nope',
    {},
    { postId: '' },
    { postId: '../../etc' },
    { postId: 'abc', commentId: 'bad id' },
  ])('rejects %j', (body) => {
    expect(() => parseLookupRequest(body)).toThrow(LookupError);
  });
});

describe('lookup', () => {
  it('returns the post with its gallery', async () => {
    const result = await lookup(reader([ fakePost('t3_abc') ]), { postId: 'abc' });
    expect(result.post).toMatchObject({ id: 't3_abc', gallery: [] });
    expect(result.comment).toBeUndefined();
    expect(result.crosspostParent).toBeUndefined();
  });

  it('returns the comment', async () => {
    const result = await lookup(
      reader([ fakePost('t3_abc') ], [ fakeComment('t1_def', 't3_abc') ]),
      { postId: 'abc', commentId: 'def' },
    );
    expect(result.comment).toMatchObject({ id: 't1_def', body: 'hello' });
  });

  it('leaves out a comment from another post', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await lookup(
      reader([ fakePost('t3_abc') ], [ fakeComment('t1_def', 't3_other') ]),
      { postId: 'abc', commentId: 'def' },
    );
    expect(result.post).toMatchObject({ id: 't3_abc' });
    expect(result.comment).toBeUndefined();
  });

  it('still returns the post when the comment is gone', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await lookup(reader([ fakePost('t3_abc') ]), { postId: 'abc', commentId: 'gone' });
    expect(result.post).toMatchObject({ id: 't3_abc' });
    expect(result.comment).toBeUndefined();
  });

  it('resolves the crosspost parent', async () => {
    const result = await lookup(
      reader([ fakePost('t3_abc', { crosspostParentId: 't3_xyz' }), fakePost('t3_xyz') ]),
      { postId: 'abc' },
    );
    expect(result.crosspostParent).toMatchObject({ id: 't3_xyz' });
  });

  it('still returns a crosspost whose parent is gone', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await lookup(reader([ fakePost('t3_abc', { crosspostParentId: 't3_gone' }) ]), { postId: 'abc' });
    expect(result.post).toMatchObject({ id: 't3_abc' });
    expect(result.crosspostParent).toBeUndefined();
  });

  it('maps a missing post to 404', async () => {
    await expect(lookup(reader([]), { postId: 'abc' })).rejects.toMatchObject({ status: 404 });
  });

  it('lets other reddit errors through', async () => {
    const failing: RedditReader = {
      getPostById:    async () => { throw new Error('rate limited'); },
      getCommentById: async () => { throw new Error('rate limited'); },
    };
    await expect(lookup(failing, { postId: 'abc' })).rejects.not.toBeInstanceOf(LookupError);
  });
});
