import { json, type RequestHandler } from '@sveltejs/kit';
import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import { validateUrl, UserAgent } from '$lib/helpers';
import { authentication, getMedia, authenticate, Domains } from '$lib/reddit';
import { get } from 'svelte/store';

type OEmbed = {
    type: 'photo' | 'video' | 'link' | 'rich',
    version: '1.0',
    title?: string,
    author_name?: string,
    author_url?: string,
    provider_name?: string,
    provider_url?: string,
    cache_age?: number,
    thumbnail_url?: string,
    thumbnail_width?: number,
    thumbnail_height?: number
}

type VideoOEmbed = OEmbed & {
    type: 'video',
    html: string,
    width : number,
    height : number
}

/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const query = evt.url.searchParams;

    const href = validateUrl(query.get('url') || '', ['dl-reddit.com', 'feat-oembed.reddit-download.pages.dev', ...Domains]);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });

    // convert the dl-reddit.com to reddit.com 
    if (href.hostname.endsWith('dl-reddit.com') || href.hostname.endsWith('reddit-download.pages.dev'))
        href.hostname = 'www.reddit.com';

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

    const media = post.media[0][0];
    const oEmbed: VideoOEmbed = {
        type: 'video',
        version: '1.0',
        title: post.title,
        html: `<video src="${media.href}" />`,
        width: media.dimension?.width ?? 480,
        height: media.dimension?.height ?? 640
    };
    return json(oEmbed);
};