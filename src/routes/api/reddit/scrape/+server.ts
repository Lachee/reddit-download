import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import { validateUrl } from '$lib/helpers';
import { scrape, Domains } from '$lib/reddit';
import { getCache, normalize } from '$lib/cache';
import { YEAR } from '$lib/time';

const CACHE_TTL = YEAR;

/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const query = evt.url.searchParams;

    const href = validateUrl(query.get('href') || '', Domains);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });

    // Try the cache
    const cached = await getCache().get(normalize(`reddit:scrape:${href}`));
    if (cached != null)
        return new Response(cached, {
            headers: {
                'content-type': 'application/json',
                'x-cached': 'true',
                'cache-control': `public, max-age=${CACHE_TTL}`
            }
        });

    // Fetch all the media, but we need to tell the API to use our credentials.
    const link = await scrape(href.toString(), { username: BOT_USERNAME, password: BOT_PASSWORD, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
    const serialized = JSON.stringify({ href: link });
    getCache().put(normalize(`reddit:scrape:${href}`), serialized, { expirationTtl: CACHE_TTL});
    return new Response(serialized, {
        headers: {
            'content-type': 'application/json',
            'x-cached': 'false',
            'cache-control': `public, max-age=${CACHE_TTL}`
        }
    });
};