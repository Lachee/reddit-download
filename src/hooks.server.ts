import  { type Handle, redirect } from '@sveltejs/kit';
import { redgif } from '$lib/redgifs';
import { createOpenGraph, proxy } from '$lib/helpers';
import type { Post } from '$lib/reddit';

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

    if (url.pathname.startsWith('/r/') && (event.request.headers.get('user-agent')?.toLowerCase().includes('discord') || url.searchParams.get('embed') == '1')) {
        throw redirect(302, '/api/reddit/media?embed=1&href=' + encodeURIComponent(url.pathname));
        //return await fetch('/api/reddit/media?embed=1&href=' + encodeURIComponent(url.pathname));
    }

    const response = await resolve(event);
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return response;
}) satisfies Handle;