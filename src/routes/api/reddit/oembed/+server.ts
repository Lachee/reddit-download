import { json, type RequestHandler } from '@sveltejs/kit';
import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import { validateUrl, UserAgent, proxy } from '$lib/helpers';
import { authentication, getMedia, authenticate, Domains, sortMedia, Variant } from '$lib/reddit';
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

type RichOEmbed = OEmbed & {
    type: 'rich',
    html: string,
    width: number,
    height: number
}

type VideoOEmbed = OEmbed & {
    type: 'video',
    html: string,
    width: number,
    height: number
}

type PhotoOEmbed = OEmbed & {
    type: 'photo',
    url: string,
    width: number,
    height: number
}


/** Follows a given reddit link to resolve the short links */
export const GET: RequestHandler = async (evt) => {
    const origin = (new URL(evt.request.url)).origin;
    const query = evt.url.searchParams;

    const href = validateUrl(query.get('url') || '', ['localhost', 'dl-reddit.com', 'pages.dev', ...Domains]);
    if (href == null)
        return json({ error: 'bad href', reason: 'corrupted, missing, or otherwise invalid' }, { status: 400 });

    // convert the dl-reddit.com to reddit.com 
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


    const media = sortMedia(post)[0][0];

    if (media.variant == Variant.Video || media.variant == Variant.PartialVideo) 
    {
        // Video
        return json({
            type: 'video',
            version: '1.0',
            title: post.title,
            html: `<video src="${media.href}" />`,
            width: media.dimension?.width ?? 480,
            height: media.dimension?.height ?? 640
        } satisfies VideoOEmbed);
    }
    else if (media.variant == Variant.GIF || media.variant == Variant.Image || media.variant == Variant.Thumbnail) 
    {
        // return json({
        //     type: 'rich',
        //     version: '1.0',
        //     title: post.title,
        //     html: `<img src="${origin}${proxy(media.href)}" />`,
        //     width: media.dimension?.width ?? 480,
        //     height: media.dimension?.height ?? 640
        // } satisfies RichOEmbed)

        // Photo
        return json({
            type: 'photo',
            version: '1.0',
            title: post.title,
            url: origin + proxy(media.href),
            width: media.dimension?.width ?? 480,
            height: media.dimension?.height ?? 640
        } satisfies PhotoOEmbed);
    }

    // We give up!
    return json({
        type: 'link',
        version: '1.0',
        title: post.title,
    } satisfies OEmbed)
};