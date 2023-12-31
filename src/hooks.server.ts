import type { Handle } from '@sveltejs/kit';

import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import { extname, rootDomain } from '$lib/helpers';
import { redgif } from '$lib/redgifs';
import { RedditDomains } from '$lib/reddit';
import { type AuthToken, authenticate, getPost } from '$lib/reddit2';
import { get, writable } from 'svelte/store';
import { MIME } from '$lib/mime';

// User-Agent because reddit will block CloudFlare's Worker user agent.
const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";
const AllowedThirdPartyDomains = [
    'imgur.com',
]

// State Management of the authentication.
// It is done this way to allow hot reloading easier.
let authentication = writable<AuthToken & { expires_at : number } | null>(null);

export const handle = (async ({ event, resolve }) => {
    const { url, fetch } = event;
    const proxyUrl = url.searchParams.get('get');
    if (proxyUrl != null) {
        // Downloads redgifs information
        // TODO: I probably should use the standard fetch stuff for this?
        if (url.pathname.startsWith('/redgif')) {
            const gif = await redgif.fetchGif(proxyUrl);
            return new Response(JSON.stringify(gif), { headers: { 'content-type': 'application/json' } });
        }

        // Proxies the content and downloads the content.
        if (url.pathname.startsWith('/download')) {
            if (proxyUrl.includes("redgif")) {
                // Download redgifs
                const body = await redgif.downloadGif(proxyUrl);
                return new Response(body);
            } else if (RedditDomains.includes(rootDomain(proxyUrl)) || AllowedThirdPartyDomains.includes(rootDomain(proxyUrl))) {
                // Download other third-parties like imgur
                const fileName = url.searchParams.get('fileName') || (new URL(proxyUrl)).pathname.replace('/', '');
                const response = await fetch(proxyUrl, {
                    headers: {
                        "User-Agent": UserAgent,
                    }
                });

                const ext = extname(fileName);
                const body = await response.body;
                const contentType = MIME[ext] || response.headers.get('content-type') || 'image/gif';
                return new Response(body, {
                    headers: {
                        'content-type': contentType,
                        'content-disposition': `attachment;filename="${fileName}"`
                    }
                });
            }
        }

        // Follows reddit links and gets their actual url
        if (url.pathname.startsWith('/follow')) {
            if (RedditDomains.includes(rootDomain(proxyUrl))) {
                const response = await fetch(proxyUrl, {
                    method: 'HEAD',
                    redirect: 'follow',
                    headers: {
                        "User-Agent": UserAgent,
                    }
                });
                return new Response(response.url, { headers: { 'content-type': 'text/plain' } });
            }
        }

        // We have to pull the page data from a post
        // This is theoretically possible, but account data needs to be included.
        // See the local test/TESTME.md for a example
        if (url.pathname.startsWith('/media')) {
            if (proxyUrl.startsWith('/r/')) {

                let auth = get(authentication);
                if (auth == null || Date.now() >= auth.expires_at) {
                    const authToken = await authenticate(BOT_USERNAME, BOT_PASSWORD, CLIENT_ID, CLIENT_SECRET);
                    if (authToken instanceof Error)
                        return new Response(JSON.stringify({ error: authToken.message }), { headers: { 'content-type': 'application/json' } });

                    auth = { ...authToken, expires_at: Date.now() + (authToken.expires_in*1000) };
                    authentication.set(auth);
                }

                const post = await getPost(proxyUrl, {
                    baseUrl: 'https://oauth.reddit.com',
                    headers: {
                        'User-Agent': 'LacheesClient/0.1 by Lachee',
                        'Authorization': `${auth.token_type} ${auth.access_token}`
                    }
                });

                return new Response(JSON.stringify(post), { headers: { 'content-type': 'application/json' } });
            }
        }
    }

    return await resolve(event);
}) satisfies Handle;