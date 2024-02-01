import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUrl, UserAgent } from '$lib/helpers';
import { authentication, authenticate, follow, Domains } from '$lib/reddit';
import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import { get } from 'svelte/store';
import { getCache, normalize } from '$lib/cache';
import { WEEK } from '$lib/time';

const AUTHENTICATION_FOR_FOLLOW = false;
const CACHE_TTL = WEEK;

/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const query = evt.url.searchParams;

    // Validate the URL
    const href = validateUrl(query.get('href') || '', Domains);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });


    // Try the cahce
    const key = normalize(`reddit:follow:${href}`);
    const cached = await getCache().get(key);
    if (cached != null) {
        return json({ href: cached }, {
            headers: {
                'cache-control': `public, max-age=${CACHE_TTL}`,
                'x-cached': 'true',
            }
        });
    }

    let init = undefined;
    if (AUTHENTICATION_FOR_FOLLOW) {
        // Authenticate with reddit. By using this proxy we probably want to ensure we will get ALL the data.
        let auth = get(authentication);
        if (auth == null || Date.now() >= auth.expires_at)
            auth = await authenticate({ username: BOT_USERNAME, password: BOT_PASSWORD, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });


        init = {
            baseUrl: 'https://oauth.reddit.com',
            headers: {
                'User-Agent': 'LacheesClient/0.1 by Lachee',
                'Authorization': `${auth.token_type} ${auth.access_token}`
            }
        };
    }

    // Follow the url
    const followed = await follow(href.toString(), init).then(url => url.toString());
    getCache().put(key, followed, { expirationTtl: CACHE_TTL });
    return json({ href: followed }, {
        headers: {
            'cache-control': `public, max-age=${CACHE_TTL}`,
            'x-cached': 'true',
        }
    });
};