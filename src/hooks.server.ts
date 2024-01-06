import type { Handle } from '@sveltejs/kit';
import { redgif } from '$lib/redgifs';
import { createOpenGraph } from '$lib/helpers';
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

    if (url.pathname.startsWith('/r/')) {
        const post : Post = await fetch('/api/reddit/media?href=' + encodeURIComponent(url.pathname)).then(p => p.json());
        const tags = createOpenGraph({
            title: post.title,
            image: post.thumbnail?.href || '',
            url: post.permalink.toString(),
            video: post.media[0][0].href
        })
        return new Response(`<html><head>\n${tags}\n</head></html>`, { headers : { 'content-type': 'text/html' }} );
    }

    const response = await resolve(event);
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return response;
}) satisfies Handle;