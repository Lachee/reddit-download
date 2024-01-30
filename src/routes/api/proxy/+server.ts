import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUrl, extname, UserAgent } from '$lib/helpers';
import { MIME } from '$lib/mime';
import { Domains } from '$lib/reddit';
import { getCache, normalize } from '$lib/cache';

const STORE_TTL = 3600;
const CACHE_TTL = STORE_TTL;

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
    const download = query.get('dl') === '1';
    const fileName = (query.get('fileName') || href.pathname.replaceAll('/', '')).replaceAll('"', '');
    const fileExt = extname(fileName);
    const key = normalize(`proxy:${href}`);

    let body : ArrayBuffer = new ArrayBuffer(0);
    let contentType : string = '';

    // Look for the cached content
    const cached = await getCache().get(key);
    if (cached != null && cached.startsWith('data:')) {
        const [ type, encodedData ] = cached.split(';', 2);
        contentType = type.substring(5);

        const [ encoding, data ] = encodedData.split(',', 2);
        body = Buffer.from(data, encoding as BufferEncoding);
    }
    else 
    {
        // Fetch the content and best type
        const response = await fetch(href, { headers: { 'origin': 'reddit.com', 'User-Agent': UserAgent } });
        if (response.status != 200)
            return new Response(await response.body, { status: response.status });

        body = await response.arrayBuffer();
        contentType = MIME[fileExt] || response.headers.get('content-type') || 'image/gif';
    }
    
    const serialized = `data:${contentType};base64,` + Buffer.from(body).toString('base64');
    getCache().put(key, serialized, { expirationTtl: STORE_TTL });

    return new Response(body, {
        headers: {
            'content-type': contentType,
            'content-disposition': `${download ? 'attachment' : 'inline'};filename="${fileName}"`,
            'cache-control': `public, max-age=${CACHE_TTL}`
        }
    });
};