import type { Handle } from '@sveltejs/kit';
import { redgif } from '$lib/redgifs';

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
    }

    return await resolve(event);
}) satisfies Handle;