import { describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { query } from '$lib/reddit/server';
import { normalizePermalink } from '$lib/reddit/Utilities';
import { getCommentType, getPostType } from '$lib/reddit/PostType';
import { POSTS, summarize } from './posts';

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
