import { describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { query } from '$lib/reddit/server';
import { normalizePermalink } from '$lib/reddit/Utilities';
import { getCommentType, getPostType } from '$lib/reddit/PostType';
import { type MediaCollection, sort } from '$lib/reddit/Media';

const RECORD = process.env.RECORD === 'true';

const env = vi.hoisted(() => {
  const record = process.env.RECORD === 'true';
  if (record)
    process.loadEnvFile();

  const secret = (key: string) => record ? process.env[key] : 'replay';
  return {
    REDDIT_CLIENT_ID:     secret('REDDIT_CLIENT_ID'),
    REDDIT_CLIENT_SECRET: secret('REDDIT_CLIENT_SECRET'),
    REDDIT_USERNAME:      secret('REDDIT_USERNAME'),
    REDDIT_PASSWORD:      secret('REDDIT_PASSWORD'),
    ALLOW_OEMBED:         'Streamable,RedGIFs',
  };
});

vi.mock('$env/dynamic/private', () => ({ env }));

const FIXTURES = join(import.meta.dirname, 'fixtures');
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API_ORIGIN = 'https://oauth.reddit.com';

const shorten = (url: string) => url.startsWith(API_ORIGIN) ? url.substring(API_ORIGIN.length) : url;
const expand = (url: string) => url.startsWith('/') ? API_ORIGIN + url : url;

const POSTS = [
  'https://www.reddit.com/r/nba/comments/1ty68vr/karlanthony_towns_if_you_lose_a_parentyou_just/',
  'https://www.reddit.com/r/gameofthrones/comments/1ty4uj0/the_cast_then_and_now/',
  'https://www.reddit.com/r/doohickeycorporation/comments/1tyia4w/the_sound_department_collaborated_with_the_sweets/',
  'https://www.reddit.com/r/hobart/comments/qxs8w2/hobart_town_hall/',
  'https://www.reddit.com/r/ffxiv/comments/124meh9/microwaved_lalashark/',
  'https://www.reddit.com/r/formula1/comments/1txxsby/charles_driving_to_perfection_in_fp1/',
  'https://www.reddit.com/r/spaceporn/comments/1tywwwh/oc_just_updated_my_giantimpact_hypothesis_sim/',
  'https://www.reddit.com/r/TopCharacterTropes/comments/1tx5ku4/using_powers_for_mundane_tasks',
  'https://www.reddit.com/r/rupaulsdragrace/comments/1ty81bn/i_need_old_untucked_back',
  'http://localhost:5173/r/IDONTGIVEASWAG/comments/1fln5rl/19_meme_dump_with_surprise_at_the_end/',
  'https://www.reddit.com/user/Lachee/comments/1wjkzx1/this_is_a_test_profile_post/',
  'https://www.reddit.com/r/ClaudeAI/comments/1wol22c/comment/pbo3njw/',
];

type Recording = {
  status: number,
  url: string,
  contentType: string,
  body: string,
};

function createFetch(fixture: string) {
  const recordings: Record<string, Recording> = RECORD || !existsSync(fixture) ? {} : JSON.parse(readFileSync(fixture, 'utf8'));

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString();
    const key = `${init?.method ?? 'GET'} ${shorten(url)}`;

    if (url === TOKEN_URL)
      return RECORD ? globalThis.fetch(input, init) : Response.json({ access_token: 'replay', token_type: 'bearer', expires_in: 3600 });

    if (RECORD) {
      const response = await globalThis.fetch(input, init);
      recordings[key] = {
        status:      response.status,
        url:         shorten(response.url),
        contentType: response.headers.get('Content-Type') ?? '',
        body:        await response.clone().text(),
      };
      return response;
    }

    const recording = recordings[key];
    if (!recording)
      throw new Error(`No recording for ${key}. Run "pnpm test:record" to record it.`);

    const response = new Response(recording.body || null, {
      status:  recording.status,
      headers: { 'Content-Type': recording.contentType },
    });
    Object.defineProperty(response, 'url', { value: expand(recording.url) });
    return response;
  };

  const save = () => {
    if (!RECORD)
      return;
    mkdirSync(FIXTURES, { recursive: true });
    writeFileSync(fixture, JSON.stringify(recordings, null, 2) + '\n');
  };

  return { fetch, save };
}

function summarize(collection: MediaCollection) {
  return collection.map(media => {
    const counts: Record<string, number> = {};
    for (const variant of media.variants)
      counts[variant.type] = (counts[variant.type] ?? 0) + 1;

    const best = sort(media.variants)[0];
    return {
      id:       media.id,
      type:     media.type,
      variants: counts,
      best:     best && {
        type:      best.type,
        href:      best.href.replace(/\?.*$/, ''),
        dimension: best.dimension && `${best.dimension.width}x${best.dimension.height}`,
      },
    };
  });
}

describe('TEST-POSTS', () => {
  it.each(POSTS)('%s', async (url) => {
    const permalink = normalizePermalink(url);
    const { fetch, save } = createFetch(join(FIXTURES, `${permalink.replace(/\/$/, '').replaceAll('/', '_')}.json`));

    try {
      const result = await query({ permalink, fetch, ttl: -1 });
      expect({
        permalink: result.permalink,
        type:      result.comment ? getCommentType(result.collection) : getPostType(result.post, result.collection),
        media:     summarize(result.collection),
      }).toMatchSnapshot();
    } finally {
      save();
    }
  }, RECORD ? 60_000 : undefined);
});
