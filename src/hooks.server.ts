import { AllowedRootDomains, rootDomain, trimParameters } from '$lib/reddit';
import type { Handle } from '@sveltejs/kit';
import { redgif } from '$lib/redgifs';

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
            } else if (AllowedRootDomains.includes(rootDomain(proxyUrl)) || AllowedThirdPartyDomains.includes(rootDomain(proxyUrl))) {
                // Download other third-parties like imgur
                const fileName = (new URL(proxyUrl)).pathname.replace('/', '');
                const response = await fetch(proxyUrl);
                const body = await response.body;
                return new Response(body, { 
                    headers: {
                        'content-type': response.headers.get('content-type') || 'image/gif',
                        'content-disposition': `attachment;filename="${fileName}"`
                    }
                });
            }
        }

        // Follows reddit links and gets their actual url
        if (url.pathname.startsWith('/follow')) {
            if (AllowedRootDomains.includes(rootDomain(proxyUrl))) {
                const response = await fetch(proxyUrl, { 
                    method: 'HEAD', 
                    redirect: 'follow' ,
                    headers: {
                        // User-Agent because reddit will block CloudFlare's Worker user agent.
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
                    }
                });
                return new Response(response.url, { headers: { 'content-type': 'text/plain' } });
            }
        }

    }

    return await resolve(event);
}) satisfies Handle;