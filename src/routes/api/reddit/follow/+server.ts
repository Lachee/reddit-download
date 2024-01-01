import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUrl, UserAgent } from '$lib/helpers';
import { follow, Domains } from '$lib/reddit2';

/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const query = evt.url.searchParams;

    // Validate the URL
    const href = validateUrl(query.get('href') || '', Domains);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });
    
    // Follow the url
    const followed = await follow(href.toString());
    return json({ href: followed.toString() });
};