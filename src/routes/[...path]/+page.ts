import type { PageLoad } from './$types';

export const load = (({ params }) => {
    return {
        postPath: params.path,
        postUrl: params.path != '' ? `https://www.reddit.com/${params.path}/` : ''
    }
}) satisfies PageLoad;