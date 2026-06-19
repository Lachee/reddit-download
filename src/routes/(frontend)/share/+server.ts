import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizePermalink } from '$lib/reddit/Utilities';

function extractRedditUrl(text: string): string {
    const match = text.match(/https?:\/\/(?:www\.)?reddit\.com\/r\/[^\s]+/);
    return match?.[0] ?? '';
}

export const GET: RequestHandler = async ({ url }) => {
    const sharedUrl = url.searchParams.get('url') ?? '';
    const sharedText = url.searchParams.get('text') ?? '';
    const candidate = sharedUrl || extractRedditUrl(sharedText);

    if (candidate) {
        const permalink = normalizePermalink(candidate);
        return redirect(302, `/share/${permalink}`);
    }

    // Eh, giveup. Go home.
    return redirect(302, '/');
};
