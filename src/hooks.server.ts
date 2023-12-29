import { RedditDomains } from '$lib/reddit';
import type { Handle } from '@sveltejs/kit';
import { redgif } from '$lib/redgifs';
import mime from 'mime-types';
import { rootDomain } from '$lib/helpers';

// User-Agent because reddit will block CloudFlare's Worker user agent.
const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

const AllowedThirdPartyDomains = [
    'imgur.com',
]

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

                const body = await response.body;
                const contentType = mime.contentType(fileName) || response.headers.get('content-type') || 'image/gif';
                return new Response(body, { 
                    headers: {
                        'content-type':  contentType,
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
                    redirect: 'follow' ,
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
        if (url.pathname.startsWith('/page')) {
            if (RedditDomains.includes(rootDomain(proxyUrl))) {
                console.log(proxyUrl);
                const response = await fetch(proxyUrl, { 
                    method: 'GET', 
                    headers: {
                        "User-Agent": UserAgent,
                        "Host": "www.reddit.com",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
                    }
                });
                const text =  await response.text();
                console.log(text.indexOf('external-preview'));
                return new Response(text, { headers: { 'content-type': 'text/plain' } });
            }
        }
    }

    return await resolve(event);
}) satisfies Handle;