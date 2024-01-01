import { json } from '@sveltejs/kit';
import type { RequestHandler } from '../$types';
import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import { validateUrl, UserAgent } from '$lib/helpers';
import { type AuthToken, getPost, authenticate, Domains } from '$lib/reddit2';
import { get, writable } from 'svelte/store';

// State Management of the authentication.
// It is done this way to allow hot reloading easier.
let authentication = writable<AuthToken & { expires_at: number } | null>(null);

/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const query = evt.url.searchParams;

    const href = validateUrl(query.get('href') || '', Domains);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });

    // Authenticate with reddit. By using this proxy we probably want to ensure we will get ALL the data.
    let auth = get(authentication);
    if (auth == null || Date.now() >= auth.expires_at) {
        const authToken = await authenticate(BOT_USERNAME, BOT_PASSWORD, CLIENT_ID, CLIENT_SECRET);
        if (authToken instanceof Error)
            return new Response(JSON.stringify({ error: authToken.message }), { headers: { 'content-type': 'application/json' } });

        auth = { ...authToken, expires_at: Date.now() + (authToken.expires_in * 1000) };
        authentication.set(auth);
    }

    // Fetch all the media, but we need to tell the API to use our credentials.
    const post = await getPost(href.toString(), {
        baseUrl: 'https://oauth.reddit.com',
        headers: {
            'User-Agent': 'LacheesClient/0.1 by Lachee',
            'Authorization': `${auth.token_type} ${auth.access_token}`
        }
    });

    return json(post);
};