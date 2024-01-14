import type { Handle } from '@sveltejs/kit';
import type { KVNamespace } from '@cloudflare/workers-types';

import { redgif } from '$lib/redgifs';
import { MemoryCache, setCache } from '$lib/cache';

export const handle = (async ({ event, resolve, }) => {
    const { url, platform } = event;
    const proxyUrl = url.searchParams.get('get');
    if (proxyUrl != null) {
        // Downloads redgifs information
        // TODO: I probably should use the standard fetch stuff for this?
        if (url.pathname.startsWith('/redgif')) {
            const gif = await redgif.fetchGif(proxyUrl);
            return new Response(JSON.stringify(gif), { headers: { 'content-type': 'application/json' } });
        }
    }

    
    const kvcache : KVNamespace|undefined = platform?.env?.KV_CACHE;
    if (kvcache !== undefined) setCache(kvcache);
        
    const response = await resolve(event);
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    return response;
}) satisfies Handle;