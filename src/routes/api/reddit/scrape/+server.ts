import { json } from '@sveltejs/kit';
import type { RequestHandler } from '../$types';
import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import { validateUrl, UserAgent } from '$lib/helpers';
import { authentication, getPost, authenticate, Domains, follow } from '$lib/reddit';
import { get } from 'svelte/store';


/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const query = evt.url.searchParams;

    const href = validateUrl(query.get('href') || '', Domains);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });

    // Authenticate with reddit. By using this proxy we probably want to ensure we will get ALL the data.
    let auth = get(authentication);
    if (auth == null || Date.now() >= auth.expires_at)
        auth = await authenticate(BOT_USERNAME, BOT_PASSWORD, CLIENT_ID, CLIENT_SECRET);


    // First request the tracker requested with me.json
    const meReq = await fetch('https://oauth.reddit.com/api/me.json', {
        method: 'HEAD',
        headers: {
            'User-Agent': 'LacheesClient/0.1 by Lachee',
            'Authorization': `${auth.token_type} ${auth.access_token}`
        }
    });
    
    const cookies = meReq.headers.getSetCookie();
    let tracker = cookies.find(c => c.startsWith('session_tracker'));
    if (tracker == undefined) return json({ error: 'no tracker cookie in me request'});
    tracker = tracker.substring(0, tracker.indexOf(';'));

    // prepare the init
    const init = {
        baseUrl: 'https://oauth.reddit.com',
        headers: {
            'User-Agent': UserAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.5',
            'Cookie': `over18=1; ${tracker}`
        }
    };

    // Fetch all the media, but we need to tell the API to use our credentials.
    const url = await follow(href.toString(), init);
    const response = await fetch(url, init);
    const html = await response.text();

    // Strip all the external links
    const links = [];
    const match = html.matchAll(/src="(https:\/\/external-[a-zA-Z0-9\/.\-?=&;%]*)/gm);
    for (const m of match)
        links.push(m[1].replaceAll('&amp;', '&'));
    
    if (links.length > 0)
        return json({ href: links[0] });

    return json({ error: 'failed to find any matches, perhaps the cookie broke' }, { status: 404 });
};