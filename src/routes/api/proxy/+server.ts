import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUrl, extname, UserAgent } from '$lib/helpers';
import { MIME } from '$lib/mime';
import { Domains } from '$lib/reddit';
import { getCache, normalize } from '$lib/cache';
import logger  from '$lib/log';
import { WEEK } from '$lib/time';
const { log } = logger('proxy');

const STORE_TTL = -1;       // We cannot actually store the media because a CF worker does not have enough memory
const CACHE_TTL = WEEK;     // How long we wish to tell the browser to store the cached results

function toB64(data: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function fromB64(b64: string): ArrayBuffer {
    const binaryString = atob(b64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

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

    let body: ArrayBuffer | ReadableStream<Uint8Array> | null = null;
    let contentType: string | null = null;

    // Look for the cached content
    const cached = await getCache().get(key);
    if (STORE_TTL >= 0 && cached != null && cached.startsWith('data:')) {
        /// Decode the data:mime;base64,content data uri
        const [type, encodedData] = cached.split(';', 2);
        contentType = type.substring(5);
        const [encoding, data] = encodedData.split(',', 2);
        if (encoding === 'base64') {
            body = fromB64(data);
        }
    }

    // We failed to fetch something, so lets just pull it again
    if (contentType === null || body === null) {
        // Fetch the content and best type
        log('downloading', href.toString());
        const response = await fetch(href, { headers: { 'origin': 'reddit.com', 'User-Agent': UserAgent } });
        if (response.status != 200)
            return new Response(await response.body, { status: response.status });

        body = STORE_TTL > 0 ? await response.arrayBuffer() : response.body;
        contentType = MIME[fileExt] || response.headers.get('content-type') || 'image/gif';
    }

    if (STORE_TTL > 0 && body !== null && "byteLength" in body) {
        const serialized = `data:${contentType};base64,` + toB64(body);
        getCache().put(key, serialized, { expirationTtl: STORE_TTL });
    }

    return new Response(body, {
        headers: {
            'content-type': contentType,
            'content-disposition': `${download ? 'attachment' : 'inline'};filename="${fileName}"`,
            'cache-control': `public, max-age=${CACHE_TTL}`
        }
    });
};