import type { Handle } from '@sveltejs/kit';

export const handle = (async ({ event, resolve }) => {
    const { url, fetch } = event;
    if (url.pathname.startsWith('/download')) {
        const file = url.searchParams.get('get');
        if (file != null) {
            const body = await fetch(file).then(f => f.arrayBuffer());
            return new Response(body);
        }
    }

    return await resolve(event);
}) satisfies Handle;