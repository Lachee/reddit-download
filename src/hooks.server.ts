import type { Handle } from '@sveltejs/kit';

export const handle = (async ({ event, resolve }) => {
    const { url, fetch } = event;
    if (url.pathname.startsWith('/download')) {
        const file = url.searchParams.get('get');
        if (file != null) {
            const response = await fetch(file);
            const body = await response.body;
            return new Response(body, { 
                headers: {
                    'content-type': response.headers.get('content-type') || 'image/gif',
                }
            });
        }
    }

    return await resolve(event);
}) satisfies Handle;