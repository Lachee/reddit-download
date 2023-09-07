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
                const response = await fetch(proxyUrl, { method: 'HEAD', redirect: 'follow' });
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