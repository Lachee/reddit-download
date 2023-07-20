import { AllowedRootDomains, rootDomain } from '$lib/reddit';
import type { Handle } from '@sveltejs/kit';



export const handle = (async ({ event, resolve }) => {
    const { url, fetch } = event;
    if (url.pathname.startsWith('/download')) {
        const proxyUrl = url.searchParams.get('get');
        if (proxyUrl != null) {
            if (AllowedRootDomains.includes(rootDomain(proxyUrl))) {
                const response = await fetch(proxyUrl);
                const body = await response.body;
                return new Response(body, { 
                    headers: {
                        'content-type': response.headers.get('content-type') || 'image/gif',
                    }
                });
            }
        }
    }

    return await resolve(event);
}) satisfies Handle;