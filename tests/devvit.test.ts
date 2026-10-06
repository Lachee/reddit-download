import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { query } from '$lib/reddit/server';
import { normalizePermalink } from '$lib/reddit/Utilities';
import { getCommentType, getPostType } from '$lib/reddit/PostType';
import { toComment, toPost } from '$lib/reddit/server/devvit/convert';
import type { DevvitPost } from '$lib/reddit/server/devvit/schema';
import { POSTS, summarize } from './posts';

/*
 * Runs the TEST-POSTS through the site with DEVVIT_URL set, so posts are read through the dltool Devvit app.
 *
 * There are no recordings of the real Devvit app yet. Its responses are simulated from the recorded
 * .json responses in tests/fixtures, following what @devvit/reddit's Post model keeps:
 * secureMedia, thumbnail, and `gallery`, which is every gallery item or, for other posts,
 * one entry from the first preview image or GIF variant.
 * Media requests (DASH manifests, Streamable) are replayed from the same recordings.
 */

const env = vi.hoisted(() => ({
  DEVVIT_URL:   'https://dltool-test-external.devvit.net',
  DEVVIT_TOKEN: 'devvit_at_test',
  ALLOW_OEMBED: 'Streamable,RedGIFs',
}));

vi.mock('$env/dynamic/private', () => ({ env }));

const FIXTURES = join(import.meta.dirname, 'fixtures');
const LOOKUP_URL = 'https://dltool-test-external.devvit.net/external/lookup';

type Raw = Record<string, any>;

const camel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function camelize(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(camelize);
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(Object.entries(value).map(([ k, v ]) => [ camel(k), camelize(v) ]));
  return value;
}

function simulateGallery(raw: Raw): DevvitPost['gallery'] {
  if (raw.gallery_data && raw.media_metadata) {
    return raw.gallery_data.items
      .map((item: Raw) => raw.media_metadata[item.media_id])
      .filter((media?: Raw) => media?.s)
      .map((media: Raw) => ({
        url:    media.s.u ?? media.s.gif ?? media.s.mp4,
        width:  media.s.x,
        height: media.s.y,
        status: media.status === 'valid' ? 1 : 2,
      }));
  }

  const image = raw.preview?.images?.[0];
  if (!image)
    return [];

  const source = image.variants?.gif?.source ?? image.source;
  return [ { url: source.url, width: source.width, height: source.height, status: 1 } ];
}

/** What the dltool app responds with for the post: Post.toJSON() and its gallery. */
function simulatePost(raw: Raw): DevvitPost {
  return {
    id:                `t3_${raw.id}`,
    authorName:        raw.author,
    subredditName:     raw.subreddit,
    permalink:         raw.permalink,
    title:             raw.title,
    body:              raw.selftext,
    url:               raw.url,
    thumbnail:         raw.thumbnail?.startsWith('http')
                         ? { url: raw.thumbnail, width: raw.thumbnail_width, height: raw.thumbnail_height }
                         : undefined,
    createdAt:         new Date(raw.created_utc * 1000).toISOString(),
    score:             raw.score,
    numberOfComments:  raw.num_comments,
    nsfw:              raw.over_18,
    spoiler:           raw.spoiler,
    locked:            raw.locked,
    archived:          raw.archived,
    stickied:          raw.stickied,
    secureMedia:       raw.secure_media ? camelize(raw.secure_media) as DevvitPost['secureMedia'] : undefined,
    gallery:           simulateGallery(raw),
    crosspostParentId: raw.crosspost_parent,
  };
}

function simulateLookup(listings: Raw[], postId: string, commentId?: string) {
  const things = listings.flatMap(listing => listing.data.children);
  const raw = things.find(thing => thing.kind === 't3' && thing.data.id === postId)?.data;
  if (!raw)
    return Response.json({ error: `t3_${postId} could not be found.` }, { status: 404 });

  const comment = commentId ? things.find(thing => thing.kind === 't1' && thing.data.id === commentId)?.data : undefined;
  const parent = raw.crosspost_parent_list?.[0];
  return Response.json({
    post:            simulatePost(raw),
    crosspostParent: parent ? simulatePost(parent) : undefined,
    comment:         comment && {
      id:         `t1_${comment.id}`,
      postId:     comment.link_id,
      authorName: comment.author,
      body:       comment.body,
      permalink:  comment.permalink,
      score:      comment.score,
    },
  });
}

/** Replays the media from the recording and answers the Devvit lookups from its .json response. */
function createFetch(fixture: string) {
  const recordings: Record<string, { status: number, url: string, contentType: string, body: string }> =
    JSON.parse(readFileSync(fixture, 'utf8'));
  const json = Object.entries(recordings).find(([ key ]) => key.endsWith('.json?raw_json=1'))![1];
  const listings: Raw[] = JSON.parse(json.body);
  const lookups: RequestInit[] = [];

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === LOOKUP_URL) {
      lookups.push(init!);
      const { postId, commentId } = JSON.parse(init!.body as string);
      return simulateLookup(listings, postId, commentId);
    }

    const recording = recordings[`${init?.method ?? 'GET'} ${url}`];
    if (!recording)
      throw new Error(`Devvit mode should not request ${url}`);

    const response = new Response(recording.body || null, {
      status:  recording.status,
      headers: { 'Content-Type': recording.contentType },
    });
    Object.defineProperty(response, 'url', { value: recording.url });
    return response;
  };

  return { fetch: fetch as typeof window.fetch, lookups };
}

const fixtureOf = (permalink: string) => join(FIXTURES, `${permalink.replace(/\/$/, '').replaceAll('/', '_')}.json`);

describe('TEST-POSTS through Devvit', () => {
  it.each(POSTS)('%s', async (url) => {
    const permalink = normalizePermalink(url);
    const { fetch, lookups } = createFetch(fixtureOf(permalink));

    const result = await query({ permalink, fetch, ttl: -1 });
    expect(lookups).toHaveLength(1);
    expect({
      permalink: result.permalink,
      type:      result.comment ? getCommentType(result.collection) : getPostType(result.post, result.collection),
      media:     summarize(result.collection),
    }).toMatchSnapshot();
  });
});

describe('Devvit lookup', () => {
  const permalink = 'r/ClaudeAI/comments/1wol22c/comment/pbo3njw/';

  it('sends the app token and the ids', async () => {
    const { fetch, lookups } = createFetch(fixtureOf(permalink));
    await query({ permalink, fetch, ttl: -1 });

    const headers = new Headers(lookups[0].headers);
    expect(lookups[0].method).toBe('POST');
    expect(headers.get('Authorization')).toBe('bearer devvit_at_test');
    expect(JSON.parse(lookups[0].body as string)).toEqual({ postId: '1wol22c', commentId: 'pbo3njw' });
  });

  it.each([
    [ 404, 404 ],
    [ 401, 502 ],
    [ 403, 502 ],
    [ 429, 429 ],
    [ 500, 502 ],
  ])('maps a %i from the app to %i', async (status, expected) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = async () => Response.json({ error: 'nope' }, { status });
    await expect(query({ permalink, fetch, ttl: -1 })).rejects.toMatchObject({ status: expected });
  });

  it('rejects a link that is not a post without asking the app', async () => {
    const fetch = vi.fn();
    await expect(query({ permalink: 'r/nba/', fetch, ttl: -1 })).rejects.toMatchObject({ status: 404 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an invalid response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = async () => Response.json({ post: { id: 't3_abc' } });
    await expect(query({ permalink, fetch, ttl: -1 })).rejects.toMatchObject({ status: 500 });
  });

  it('denies NSFW posts', async () => {
    const fetch = async () => Response.json({ post: base({ nsfw: true }) });
    await expect(query({ permalink: 'r/test/comments/abc/', fetch, ttl: -1 })).rejects.toMatchObject({ status: 451 });
  });

  it('presents the original of a crosspost', async () => {
    const fetch = async () => Response.json({
      post:            base({ crosspostParentId: 't3_xyz', title: 'Crosspost' }),
      crosspostParent: base({ id: 't3_xyz', title: 'Original', permalink: '/r/original/comments/xyz/original/' }),
    });
    const result = await query({ permalink: 'r/test/comments/abc/', fetch, ttl: -1 });
    expect(result.post.title).toBe('Original');
    expect(result.permalink).toBe('r/original/comments/xyz/');
  });
});

function base(extra: Partial<DevvitPost> = {}): DevvitPost {
  return {
    id:            't3_abc',
    subredditName: 'test',
    permalink:     '/r/test/comments/abc/title/',
    title:         'Title',
    url:           'https://www.reddit.com/r/test/comments/abc/title/',
    createdAt:     '2026-10-06T00:00:00.000Z',
    gallery:       [],
    ...extra,
  };
}

describe('toPost', () => {
  it('unescapes html in the oembed and urls', () => {
    const post = toPost(base({
      url:         'https://streamable.com/abc?a=1&amp;b=2',
      secureMedia: {
        oembed: {
          providerName: 'Streamable',
          html:         '&lt;iframe src=&quot;https://streamable.com/e/abc&quot;&gt;&lt;/iframe&gt;',
        },
      },
    }));
    expect(post.url).toBe('https://streamable.com/abc?a=1&b=2');
    expect(post.secure_media?.oembed?.html).toBe('<iframe src="https://streamable.com/e/abc"></iframe>');
  });

  it('turns gallery items into media_metadata in order', () => {
    const post = toPost(base({
      url:     'https://www.reddit.com/gallery/abc',
      gallery: [
        { url: 'https://i.redd.it/second.png', width: 10, height: 20, status: 1 },
        { url: 'https://i.redd.it/first.gif', width: 30, height: 40, status: 1 },
        { url: 'https://i.redd.it/broken.jpg', width: 1, height: 1, status: 2 },
      ],
    }));

    expect(post.gallery_data?.items.map(item => item.media_id)).toEqual([ 'second', 'first', 'broken' ]);
    expect(post.media_metadata).toMatchObject({
      second: { status: 'valid', m: 'image/png', s: { u: 'https://i.redd.it/second.png', x: 10, y: 20 } },
      first:  { status: 'valid', m: 'image/gif', s: { gif: 'https://i.redd.it/first.gif' } },
      broken: { status: 'failed' },
    });
  });

  it('turns a single image into the preview', () => {
    const post = toPost(base({
      url:     'https://i.redd.it/abc.jpeg',
      gallery: [ { url: 'https://preview.redd.it/abc.jpeg?auto=webp&amp;s=1', width: 100, height: 50, status: 1 } ],
    }));

    expect(post.post_hint).toBe('image');
    expect(post.url_overridden_by_dest).toBe('https://i.redd.it/abc.jpeg');
    expect(post.preview?.images?.[0]).toMatchObject({
      id:     'abc',
      source: { url: 'https://preview.redd.it/abc.jpeg?auto=webp&s=1', width: 100, height: 50 },
    });
  });

  it('treats a still of a gif as an image', () => {
    const post = toPost(base({
      gallery: [ { url: 'https://preview.redd.it/abc.gif?format=png8&s=1', width: 1, height: 1, status: 1 } ],
    }));
    expect(post.preview?.images?.[0].variants.gif).toBeUndefined();
  });

  it('keeps self posts as self posts', () => {
    const post = toPost(base({ body: 'hello' }));
    expect(post.is_self).toBe(true);
    expect(post.selftext).toBe('hello');
    expect(post.url_overridden_by_dest).toBeUndefined();
  });

  it('prefixes profile posts with u/', () => {
    expect(toPost(base({ subredditName: 'u_Lachee' })).subreddit_name_prefixed).toBe('u/Lachee');
  });
});

describe('toComment', () => {
  it('reads inline images from the body', () => {
    const comment = toComment({
      id:        't1_def',
      permalink: '/r/test/comments/abc/_/def/',
      body:      'look ![img](https://preview.redd.it/my-pic-v0-abc123.png?width=640&amp;format=png) and https://i.redd.it/xyz.gif',
    });

    expect(comment.name).toBe('t1_def');
    expect(comment.media_metadata).toMatchObject({
      'my-pic-v0-abc123': { m: 'image/png', s: { u: 'https://preview.redd.it/my-pic-v0-abc123.png?width=640&format=png' } },
      'xyz':              { m: 'image/gif', s: { gif: 'https://i.redd.it/xyz.gif' } },
    });
  });
});
