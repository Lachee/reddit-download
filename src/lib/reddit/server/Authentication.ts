import { env } from '$env/dynamic/private';

const USER_AGENT = 'node:com.lachee.redditclient:v0.1.0 (by /u/Lachee)'

type RedditAuthToken = {
  access_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  get authorization(): string;
}

let auth: RedditAuthToken | undefined;
let pending: Promise<RedditAuthToken> | undefined;

function isValidAuth(): boolean {
  // Refresh 60 seconds early so you do not race the expiry.
  return auth !== undefined && auth.expires_at > Date.now() + 60_000;
}

export async function authenticate(fetch: typeof window.fetch): Promise<RedditAuthToken> {
  if (isValidAuth())
    return auth!;

  if (pending)
    return pending;

  return pending = requestAuthentication(fetch).finally(() => pending = undefined);
}

async function requestAuthentication(fetch: typeof window.fetch): Promise<RedditAuthToken> {
  const REDDIT_CLIENT_ID = env.REDDIT_CLIENT_ID;
  const REDDIT_CLIENT_SECRET = env.REDDIT_CLIENT_SECRET;
  const REDDIT_USERNAME = env.REDDIT_USERNAME;
  const REDDIT_PASSWORD = env.REDDIT_PASSWORD;

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    throw new Error('Missing Reddit credentials. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, and REDDIT_PASSWORD.');
  }

  console.log('Authenticating with Reddit as ', REDDIT_USERNAME);

  const form = new FormData();
  form.append('grant_type', 'password');
  form.append('username', REDDIT_USERNAME);
  form.append('password', REDDIT_PASSWORD);

  const basicAuth = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    body: form,
    headers: {
      'User-Agent': USER_AGENT,
      'Authorization': `Basic ${basicAuth}`,
    },
  });

  if (response.status != 200) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`)
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Token request failed: ' + JSON.stringify(data));
  }

  return auth = {
    access_token: data.access_token,
    scope: data.scope,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expires_at: Date.now() + (data.expires_in * 1000),
    get authorization(): string {
      return `${data.token_type} ${data.access_token}`
    }
  };
}
