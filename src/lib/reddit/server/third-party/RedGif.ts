import { z } from 'zod';
import type { OembedProvider } from "$lib/reddit/server/third-party/index";
import { type Variant, VariantType } from "$lib/reddit/Media";

const USER_AGENT: string = "redgifs (https://github.com/lachee/reddit-downloader 1.0.0) TypeScript/2.4.1"
let authToken: string | undefined;

const gifSchema = z.looseObject({
  urls:     z.object({
    hd:        z.string(),
    sd:        z.string(),
    html:      z.string(),
    thumbnail: z.string(),
    poster:    z.string(),
    silent:    z.string().optional(),
  }),
  width:    z.number(),
  height:   z.number(),
  id:       z.string(),
  hasAudio: z.boolean(),
})

const gifResponseSchema = z.looseObject({
  gif:    gifSchema,
  user:   z.looseObject({}),
  niches: z.array(z.looseObject({})),
})

const streamable: OembedProvider = async (_fetch, oembed): Promise<Variant[]> => {
  // Extract the gif id from the iframe
  const iframe = oembed.html;
  if (!iframe) {
    console.error(`[redgif] oembed "${oembed.title ?? ''}" has no iframe html to read the gif from`)
    return [];
  }

  const redgifUrl = iframe.match(/src="([^"]+)"/)?.[1];
  if (!redgifUrl) {
    console.error('[redgif] oembed iframe has no src:', iframe)
    return [];
  }

  const gifId = redgifUrl.substring(redgifUrl.lastIndexOf('/') + 1);

  // Fetch the gif data from RedGIFs
  const data = await request(`/v2/gifs/${gifId}`);
  const validation = gifResponseSchema.safeParse(data);
  if (!validation.success) {
    console.error(`[redgif] gif ${gifId} did not match the expected schema:`, validation.error.issues);
    return [];
  }

  const { gif } = validation.data;

  console.log(`[redgif] found gif ${gifId} (${gif.width}x${gif.height})`);
  const aspect = gif.height / gif.width;
  return [
    {
      id:        gif.id,
      href:      gif.urls.hd,
      mime:      'video/mp4',
      type:      VariantType.Video,
      dimension: { width: gif.width, height: gif.height }
    },
    {
      id:        gif.id,
      href:      gif.urls.poster,
      mime:      'image/jpeg',
      type:      VariantType.Image,
      dimension: { width: gif.width, height: gif.height }
    },
    {
      id:        gif.id,
      href:      gif.urls.sd,
      mime:      'video/mp4',
      type:      VariantType.Video,
      dimension: { width: 480, height: Math.round(480 * aspect) }
    },
    {
      id:        gif.id,
      href:      gif.urls.thumbnail,
      mime:      'image/jpeg',
      type:      VariantType.Image,
      dimension: { width: 480, height: Math.round(480 * aspect) }
    },
  ] satisfies Variant[];
}

// Uses the global fetch rather than SvelteKit's event fetch, as SvelteKit adds an
// Origin header to cross-origin requests which RedGIFs rejects with a 400.
async function login() {
  console.log('[redgif] requesting a temporary auth token');
  const response = await fetch('https://api.redgifs.com/v2/auth/temporary', {
    headers: {
      "User-Agent": USER_AGENT
    }
  })

  if (!response.ok)
    throw new Error('Failed to login to RedGIFs');

  const data = await response.json();
  authToken = data.token;
}

async function request<T>(endpoint: string): Promise<T> {
  if (authToken == null)  // Auto Login, but if we fail then just give up
    await login();

  // Make the request
  const response = await fetch(`https://api.redgifs.com${endpoint}`, {
    headers: {
      'authorization': `Bearer ${authToken}`,
      "User-Agent":    USER_AGENT,
    }
  });

  if (response.status == 401) {
    console.warn(`[redgif] ${endpoint} returned 401, the token has likely expired. Retrying with a new token`);
    authToken = undefined;
    return await request<T>(endpoint);
  }

  if (response.status == 200)
    return (await response.json()) as T;

  console.error(`[redgif] ${endpoint} failed: ${response.status} ${response.statusText}`, await response.text());
  throw new Error('Failed to fetch request!');
}

export default streamable;