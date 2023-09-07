import { AllowedRootDomains, rootDomain, trimParameters } from '$lib/reddit';
import type { Handle } from '@sveltejs/kit';

const AllowedThirdPartyDomains = [
    'imgur.com',
]

export const handle = (async ({ event, resolve }) => {
    const { url, fetch } = event;
    const proxyUrl = url.searchParams.get('get');
    if (proxyUrl != null) {
        // Proxies the content and downloads the content.
        if (url.pathname.startsWith('/download')) {
            if (AllowedRootDomains.includes(rootDomain(proxyUrl)) || AllowedThirdPartyDomains.includes(rootDomain(proxyUrl))) {
                const response = await fetch(proxyUrl);
                const body = await response.body;
                return new Response(body, { 
                    headers: {
                        'content-type': response.headers.get('content-type') || 'image/gif',
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
                
                console.log({
                    url: response.url,
                    status: response.status,
                    redirected: response.redirected,
                    headers: response.headers,
                });
                return new Response(response.url, { headers: { 'content-type': 'text/plain' } });
            }
        }
    }

    return await resolve(event);
}) satisfies Handle;