import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractRedditUrl } from '$lib/reddit/server/Links';
import { query } from '$lib/reddit/server';
import { track } from '$lib/server/Analytics';

const SOURCES = [ 'shortcut' ];

export const GET: RequestHandler = async ({ url, request, fetch, getClientAddress }) => {
    const sharedUrl = url.searchParams.get('url') ?? '';
    const sharedText = url.searchParams.get('text') ?? '';
    const candidate = sharedUrl || extractRedditUrl(sharedText);

    const source = url.searchParams.get('source') ?? '';
    // Fetching the post gives the canonical permalink (short links don't include the subreddit) and warms the cache for the page.
    const permalink = candidate
        ? await query({ permalink: candidate, fetch }).then(r => r.permalink, () => '')
        : '';

    track('share', {
        source:   SOURCES.includes(source) ? source : 'share-target',
        resolved: permalink !== '',
    }, {
        url,
        request,
        address: getClientAddress(),
    });

    if (permalink)
        return redirect(302, `/${permalink}`);

    // Eh, giveup. Go home.
    return redirect(302, '/');
};

