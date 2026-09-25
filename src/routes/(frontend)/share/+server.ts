import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizePermalink } from '$lib/reddit/Utilities';
import { fetchPost } from '$lib/reddit/server/Post';
import { track } from '$lib/server/Analytics';

const SOURCES = [ 'shortcut' ];

const SHORT_LINK = /^https?:\/\/(?:www\.)?redd\.it\/([a-z0-9]+)/i;

function extractRedditUrl(text: string): string {
    const match = text.match(/https?:\/\/(?:[a-z]+\.)?(?:reddit\.com\/(?:r|user|u)|redd\.it)\/[^\s]+/i);
    return match?.[0] ?? '';
}

async function resolveShortLink(fetch: typeof window.fetch, id: string): Promise<string> {
    try {
        const { post } = await fetchPost(fetch, `comments/${id}`);
        return normalizePermalink(post.permalink);
    } catch (error) {
        console.warn('Failed to resolve short link', id, error);
        return '';
    }
}

export const GET: RequestHandler = async ({ url, request, fetch, getClientAddress }) => {
    const sharedUrl = url.searchParams.get('url') ?? '';
    const sharedText = url.searchParams.get('text') ?? '';
    const candidate = sharedUrl || extractRedditUrl(sharedText);

    const source = url.searchParams.get('source') ?? '';
    const shortLink = candidate.match(SHORT_LINK);
    const permalink = shortLink !== null
        ? await resolveShortLink(fetch, shortLink[1])
        : candidate && normalizePermalink(candidate);

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
