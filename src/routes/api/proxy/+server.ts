import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUrl, extname, UserAgent } from '$lib/helpers';
import { MIME } from '$lib/mime';
import { Domains } from '$lib/reddit2';


export const GET: RequestHandler = async (request) => {
    const query = request.url.searchParams;

    const href = validateUrl(query.get('href') || '', ['imgur.com', 'redgifs.com', ...Domains]);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });

    if (href.hostname === 'redgifs.com') {
        //FIXME: Redgifs
        return json({ error: 'not yet implemented' }, { status: 501 });
    }

    // Prepare the filenames
    const fileName = (query.get('fileName') || href.pathname.replaceAll('/', '')).replaceAll('"', '');
    const fileExt = extname(fileName);

    // Fetch the content
    const response = await fetch(href, { headers: { 'User-Agent': UserAgent } });
    const body = await response.body;
    if (response.status != 200)
        return new Response(body, { status: response.status });

    // Get the content type.
    // Normally we would just use the response headers, but Reddit LIES
    const contentType = MIME[fileExt] || response.headers.get('content-type') || 'image/gif';
    return new Response(body, {
        headers: {
            'content-type': contentType,
            'content-disposition': `attachment;filename="${fileName}"`
        }
    });
};