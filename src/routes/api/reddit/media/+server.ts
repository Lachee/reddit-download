import { json } from '@sveltejs/kit';
import type { RequestHandler } from '../$types';
import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import { validateUrl, UserAgent } from '$lib/helpers';
import { authentication, getMedia, authenticate, Domains, sortMedia, Variant } from '$lib/reddit';
import { get } from 'svelte/store';
import { MIME, extmime } from '$lib/mime';


/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const query = evt.url.searchParams;

    const href = validateUrl(query.get('href') || '', Domains);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });

    // Authenticate with reddit. By using this proxy we probably want to ensure we will get ALL the data.
    let auth = get(authentication);
    if (auth == null || Date.now() >= auth.expires_at)
        auth = await authenticate(BOT_USERNAME, BOT_PASSWORD, CLIENT_ID, CLIENT_SECRET);

    // Fetch all the media, but we need to tell the API to use our credentials.
    const post = await getMedia(href.toString(), {
        baseUrl: 'https://oauth.reddit.com',
        headers: {
            'User-Agent': 'LacheesClient/0.1 by Lachee',
            'Authorization': `${auth.token_type} ${auth.access_token}`
        }
    });

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

    return json(post);
};