import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';

import { getCache, normalize } from '$lib/cache';
import { validateUrl } from '$lib/helpers';
import { Domains, getMedia } from '$lib/reddit';
import { WEEK } from '$lib/time';

const CACHE_TTL = WEEK;

/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const query = evt.url.searchParams;

    const href = validateUrl(query.get('href') || '', Domains);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });

    // Try the cache
    const key = normalize(`reddit:media:${href}`);
    const cached = await getCache().get(key);
    if (cached != null) {
        return new Response(cached, {
            headers: {
                'content-type': 'application/json',
                'cache-control': `public, max-age=${CACHE_TTL}`,
                'x-cached': 'true'
            }
        });
    }

    // Fetch all the media, but we need to tell the API to use our credentials.
    const post = await getMedia(href.toString(), {
        credentials: { username: BOT_USERNAME, password: BOT_PASSWORD, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }
    });

    const serialized = JSON.stringify(post);
    getCache().put(key, serialized, { expirationTtl: CACHE_TTL });
    return new Response(serialized, {
        headers: {
            'content-type': 'application/json',
            'cache-control': `public, max-age=${CACHE_TTL}`,
            'x-cached': 'false'
        }
    });
};


/*  TODO:   Make an API to embed the content from just a reddit post.
            This isn't actually required at this stage because OG:Tags work again

// Generates an embed
if (query.get('embed') === '1') {
    // Resort the media and pick the best one
    const media = sortMedia(post, [
        Variant.GIF,
        Variant.Video,
        Variant.PartialVideo,
        Variant.Image,
        Variant.Thumbnail,
        Variant.PartialAudio,
        Variant.Blur,
    ])[0][0];
    
    const mediaURL = media.href;
    const response = await fetch(mediaURL, { headers: { 'origin': 'reddit.com', 'User-Agent': UserAgent } });
    const body = await response.body;
    if (response.status != 200)
        return new Response(body, { status: response.status });

    // Get the content type.
    // Normally we would just use the response headers, but Reddit LIES
    const headers: HeadersInit = {
        'content-type': MIME[media.mime] || response.headers.get('content-type') || 'image/gif',
        'content-disposition': `inline;filename="${post.id}.${extmime(media.mime)}"`,
    };

    return new Response(body, { headers });
}
*/