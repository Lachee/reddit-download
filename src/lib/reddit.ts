import { UserAgent, extname, stripQueryParameters, validateUrl } from './helpers';
import { browser } from '$app/environment';
import { XMLParser } from 'fast-xml-parser';
import fetchJsonp from 'fetch-jsonp';
import { writable } from 'svelte/store';

/** Enables the MP4 previews that are generated from gifs */
const INCLUDE_MP4_IN_VARIANTS = false;
const USE_JSONP = false;

/** Root Domains reddit operates */
export const Domains = [
    'reddit.com',
    'redd.it',
    'redditstatic.com',
    'redditmedia.com',
];

export type Post = {
    /** ID of the reddit post */
    id: string;
    /** The address the post points too */
    url: URL
    /** The permalink to the post */
    permalink: URL
    /** unique identifier for hte post */
    name: string
    /** The post is marked NSFW */
    nsfw: boolean
    /** The subreddit it's from */
    subreddit: string
    /** Title of the post */
    title: string
    /** Is the post a video */
    isVideo: boolean;

    /** List of all every unique media*/
    media: MediaVariantCollection[];
    /** The thumbnail used to represent the media */
    thumbnail?: Media;
}

export type Mime =
    'image/png' | 'image/jpeg' | 'image/gif' | 'video/mp4' | 'audio/mp4';

export enum Variant {
    /** Presentable actual image */
    Image = 'image',
    /** Preview static represnetations of an image */
    Thumbnail = 'thumbnail',
    /** Blured preview image */
    Blur = 'blur',
    /** Animated image (GIF) */
    GIF = 'gif',
    /** Presentable Video */
    Video = 'video',
    /** Video Clip that requires combining with PartialAudio */
    PartialVideo = 'video_only',
    /** Partial audio channel that needs combing with a VideoClip */
    PartialAudio = 'audio',
}

export type MediaVariantCollection = Media[];

export type Media = {
    mime: Mime;
    variant: Variant;
    href: string;
    /** Size of the media */
    dimension?: { width: number, height?: number }
}



/** Authorization Tokens */
export type AuthToken = RedditAuthToken & {
    expires_at: number;
}
type RedditVideo = {
    dash_url: string,
    fallback_url?: string,
    width?: number,
    height?: number
};
type RedditAuthToken = {
    access_token: string;
    scope: string;
    token_type: string;
    expires_in: number;
}

/** Configuration for HTTP requests to reddit */
export type ReqInit = {
    baseUrl: string;
    headers: Record<string, string>;
}

function debug(...args: any[]) {
    if (browser) log(...args);
}
function log(...args: any[]) {
    console.log('[REDDIT]', ...args);
}
function warn(...args: any[]) {
    console.warn('[REDDIT]', ...args);
}
function error(...args: any[]) {
    console.error('[REDDIT]', ...args);
}
function group(...args: any[]) {
    console.groupCollapsed('[REDDIT]', ...args);
}
function groupEnd() {
    console.groupEnd();
}

/** Follows the shortened links */
export async function follow(href: string, init?: ReqInit): Promise<URL> {
    const url = validateUrl(href, Domains);
    if (url === null)
        throw new Error('cannot follow an invalid URL');

    const shareLinkRegex = /reddit.com\/r\/\w*\/s\//
    if (shareLinkRegex.test(url.toString())) {

        // The browser cannot follow the link because CORS,
        // so instead, we will make a request to the API to follow the link.
        if (browser) {
            log(`requesting shorthand ${url}`);
            const shorthand = await fetch('/api/reddit/follow?href=' + encodeURIComponent(url.toString())).then(r => r.json());
            log('shorthand response:', shorthand);
            return new URL(shorthand.href);
        }


        log(`following shorthand ${url}`);
        if (!init) init = { baseUrl: url.origin, headers: { 'User-Agent': UserAgent } };
        const response = await fetch(`${init.baseUrl}${url.pathname}`, {
            method: 'HEAD',
            redirect: 'follow',
            headers: init.headers
        });

        return new URL(response.url);
    }

    return url;
}

/** Follows a reddit post and tries to get the cached images. Only use this on a last resort */
async function scrape(href: string): Promise<URL | null> {
    const url = validateUrl(href, Domains);
    if (url === null)
        throw new Error('cannot follow an invalid URL');

    log(`scrapping the cached data from reddit ${url}`);
    const scrape = await fetch('/api/reddit/scrape?href=' + encodeURIComponent(url.toString())).then(r => r.json());
    if ('href' in scrape)
        return new URL(scrape.href);

    error('failed to find anything from the scrapped page.', scrape);
    return null;
}

// State Management of the authentication.
// It is done this way to allow hot reloading easier.
export const authentication = writable<AuthToken & { expires_at: number } | null>(null);

/** Authenticates the API for oauth2 usage. */
export async function authenticate(username: string, password: string, clientId: string, clientSecret: string): Promise<AuthToken> {
    const form = new FormData();
    form.append('grant_type', 'password');
    form.append('username', username);
    form.append('password', password);

    log('authenticating as ', username);
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        body: form,
        headers: {
            'User-Agent': 'LacheesClient/0.1 by Lachee',
            'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
        },
    });

    const data = await response.json();
    if ('error' in response) {
        error('failed to authenticate', response);
        throw new Error(data.error);
    }

    const authToken: AuthToken = { ...data, expires_at: Date.now() + (data.expires_in * 1000) };
    authentication.set(authToken);
    return authToken;
}

/**
 * Gets a reddit post, collating all the appropriate media
 * @param url the link to the reddit post
 * @returns 
 */
export async function getMedia(link: string, init?: ReqInit): Promise<Post> {
    group('fetching post', link);
    try {
        // Prepare the request settings.
        const url = await follow(link, init);

        let request: Promise<Response | fetchJsonp.Response>;

        // If we are in a browser, fetch using JSONP. Otherwise fetch just using a regular fetch.
        if (USE_JSONP && browser && !init) {
            request = fetchJsonp(`${url.origin}${url.pathname}.json?raw_json=1`, { jsonpCallback: 'jsonp', crossorigin: true });
            log('getting reddit post via jsonp');
        } else {
            if (!init) init = { baseUrl: url.origin, headers: {} };
            request = fetch(`${init.baseUrl}${url.pathname}.json?raw_json=1`, { headers: init.headers });
            log('getting reddit post via fetch');
        }

        // Await the request
        const data = await request
            .then(res => res.json())
            .then(dat => dat[0].data.children[0].data)
            .then(pos => pos.crosspost_parent_list && pos.crosspost_parent_list.length > 0 ? pos.crosspost_parent_list[pos.crosspost_parent_list.length - 1] : pos)
            .catch(cor => cor);


        // If we are in the browser and we are getting weird data, lets request for the bot to take care of it
        // We are checking for preview because if they aint giving us that they probably gonna be stingy fucks
        // ( removing the preview check breaks  https://www.reddit.com/r/egg_irl/comments/18vimr6/egg_irl/ ??? )
        if (browser && (data instanceof Error)) {
            log('getting reddit post via proxy');
            const post = await fetch(`/api/reddit/media?href=${encodeURIComponent(url.toString())}`)
                .then(res => res.json());

            log('downloaded post: ', post);
            return post;
        }

        // Validate we have no error. If we do just throw
        if (data instanceof Error)
            throw data;

        debug('downloaded json, parsing: ', data);
        const permalink = `https://www.reddit.com${data.permalink}`;
        const post: Post = {
            id: data.id,
            url: new URL(data.url || permalink),
            permalink: new URL(permalink),
            name: data.name,
            subreddit: data.subreddit,
            title: data.title,
            nsfw: data.over_18,
            isVideo: data.is_video ?? false,
            media: await getAllMediaVariantCollections(data),
        };

        // Parse the thumbnail if possible
        if ('thumbnail' in data && data.thumbnail != '') {
            post.thumbnail = {
                mime: 'image/jpeg',
                variant: Variant.Thumbnail,
                href: data.thumbnail
            };

            if (data.thumbnail_width) {
                post.thumbnail.dimension = { width: +data.thumbnail_width };
                if (data.thumbnail_height)
                    post.thumbnail.dimension.height = +data.thumbnail_height;
            }
        }

        // Parse the url_overriden_by_dest. This maybe a special case
        if ('url_overridden_by_dest' in data && typeof data.url_overridden_by_dest === 'string') {
            const overridden: string = data.url_overridden_by_dest;
            if (overridden.includes('.', overridden.lastIndexOf('/'))) {
                const ext = extname(overridden);
                const media: Media = {
                    mime: 'image/' + (ext == 'jpg' ? 'jpeg' : ext) as Mime,
                    variant: Variant.Image,
                    href: overridden
                };
                if (ext == 'gif') {
                    media.variant = Variant.GIF;
                } else if (ext == 'mp4') {
                    media.mime = 'video/mp4';
                    media.variant = Variant.Video;
                }

                if (post.media.length == 0)
                    post.media.push([]);

                post.media[0].push(media);
            }
        }

        // Validate the IMGUR posts. If they fail, we will need to scrape the page
        // FIXME: Make this a seperate function
        if (post.media.length == 1 && post.media[0].length == 1 && post.media[0][0].href.includes('i.imgur')) {
            // Validate the IMGUR post has been removed
            const media = post.media[0][0];
            log('validating that the imgur post is correct still: ', media.href);
            const response = await fetch(media.href, { method: 'HEAD', redirect: 'manual' });

            // It has, so lets scrape reddit. This can take a long time.
            if (response.status != 200) {
                warn('imgur media did not respond with a 200! Fetching cached content', response.status);
                const mediaHref = await scrape(url.toString());

                // Ensure we have a result, then try to determine the best content-type
                if (mediaHref != null) {
                    log(`updating only media item to use cached results: ${mediaHref}`);
                    media.href = mediaHref.toString();
                    const mediaFormat = mediaHref.searchParams.get('format');
                    if (mediaFormat === 'mp4') {
                        media.mime = 'video/mp4';
                        media.variant = Variant.PartialVideo;   // Partial Video so it automatically gets converted.
                    } else if (mediaFormat === 'png') {
                        media.mime = 'image/png';
                        media.variant = Variant.Image;
                    } else if (mediaFormat === 'jpg' || mediaFormat === 'jpeg') {
                        media.mime = 'image/jpeg';
                        media.variant = Variant.Image;
                    } else {
                        // const ext = extname(mediaHref.pathname); FIXME: We should determine the type based of the extension
                        media.mime = 'image/gif';
                        media.variant = Variant.GIF;
                    }

                } else {
                    error('failed to find any cached results for imgur');
                }
            } else {
                log('correct!', { status: response.status })
            }
        }

        log('parsed post: ', browser ? post : post.title);
        return post;
    } finally {
        groupEnd();
    }
}

/** Parses the reddit post to get a media collection */
async function getAllMediaVariantCollections(data: unknown): Promise<MediaVariantCollection[]> {
    if (data == null || typeof data !== 'object') {
        error('failed to parse media collection because no post was given');
        return [];
    }

    let collections: MediaVariantCollection[] = [];

    // post.media_metadata ( this is multiple images )
    if ('media_metadata' in data && data.media_metadata != null && typeof data.media_metadata === 'object') {
        const mediaMetadataCollections = getMediaMetadataCollections(data.media_metadata);
        collections = collections.concat(mediaMetadataCollections);
    }

    // post.preview ( this is only one image, but lots of ways to represent it )
    if ('preview' in data && data.preview != null && typeof data.preview === 'object') {
        const previewCollection = await getPreviewCollection(data.preview);
        if (previewCollection.length > 0)
            collections.push(previewCollection);
    }

    // post.secure_media
    if ('secure_media' in data && data.secure_media != null && typeof data.secure_media === 'object') {
        const secureMediaCollection = await getSecureMediaCollectionAsync(data.secure_media);
        if (secureMediaCollection.length > 0) {
            if (collections.length == 0) {
                collections.push([]);
            }

            // Prepend the video the the first item. We are an extension to that.
            collections[0] = secureMediaCollection.concat(collections[0]);
        }
    }

    debug('parsed all collections:', collections);
    return collections;
}

/** gets the collections within the post.media_collection */
function getMediaMetadataCollections(metadata: Record<string, any>): MediaVariantCollection[] {
    const collections: MediaVariantCollection[] = [];
    for (const meta of Object.values(metadata)) {
        if (typeof meta !== 'object') continue;
        if ("status" in meta && meta.status !== "valid") continue;
        if (!("s" in meta)) continue;

        // reddit uses the invalid image/jpg, we need to fix it.
        const mime = meta.m === 'image/jpg' ? 'image/jpeg' : meta.m;
        const collection: MediaVariantCollection = [];

        // Push the root level, best server first (S)
        collection.push(getMediaMetadataMediaFromObject(meta.s, mime, Variant.Image));

        // Push the previews
        if ('p' in meta && Array.isArray(meta.p)) {
            for (const previewData of meta.p)
                collection.push(getMediaMetadataMediaFromObject(previewData, 'image/jpeg', Variant.Thumbnail))
        }

        // Push the blurs
        if ('o' in meta && Array.isArray(meta.o)) {
            for (const blurData of meta.o)
                collection.push(getMediaMetadataMediaFromObject(blurData, 'image/jpeg', Variant.Blur))
        }

        // Pusht he collection
        collections.push(collection);
    }

    debug('parsed media_metadata collections: ', collections);
    return collections;
}
/** gets the individual media object from within a media_collection's variants */
function getMediaMetadataMediaFromObject(data: unknown, defaultMime: Mime, defaultVaraint: Variant): Media {
    // Ensure object
    if (data == null || typeof data !== 'object') {
        error('failed to parse the variant media object from the metadata', data);
        throw new Error('metadata media object given is invalid');
    }

    let media: Partial<Media> = {
        mime: defaultMime,
        variant: defaultVaraint,
    };

    // Sort out the url
    if ('u' in data && typeof data.u === 'string') {
        media.href = data.u;
    } else if ('gif' in data && typeof data.gif === 'string') {
        media.href = data.gif;
        media.variant = Variant.GIF;
        media.mime = 'image/gif'
    } else if ('mp4' in data && typeof data.mp4 === 'string') {
        media.href = data.mp4;
        media.variant = Variant.Video;
        media.mime = 'video/mp4';
    }

    // Sort out size
    if ('x' in data && (typeof data.x === 'string' || typeof data.x === 'number')) {
        media.dimension = { width: +data.x };
        if ('y' in data && (typeof data.y === 'string' || typeof data.y === 'number')) {
            media.dimension.height = +data.y;
        }
    }

    // Ensure all the properties are set. 
    // We do an as cast because typescript is dumb
    if ('href' in media && 'mime' in media && 'variant' in media)
        return media as Media;

    error('missing critical fields in the media from the metadata', media, data);
    throw new Error('failed to find any media in the metadata object');
}

/** gets the secure media collection */
async function getSecureMediaCollectionAsync(secureMedia: unknown): Promise<MediaVariantCollection> {
    if (secureMedia == null || typeof secureMedia !== 'object')
        return [];

    // Validate the post.secure_media.reddit_video
    if (!('reddit_video' in secureMedia) || secureMedia.reddit_video == null || typeof secureMedia.reddit_video !== 'object') {
        warn('no reddit_video in secure media', secureMedia);
        return [];
    }

    const redditVideo = secureMedia.reddit_video;
    if ('dash_url' in redditVideo && typeof redditVideo.dash_url === 'string')
        return await getRedditVideoCollection(redditVideo as RedditVideo);

    error('Failed to find a valid reddit video');
    return [];
}
/** Gets the video content from a RedditVideo */
async function getRedditVideoCollection(redditVideo: RedditVideo): Promise<MediaVariantCollection> {

    // Dash media
    const response = await fetch(redditVideo.dash_url);
    const url = new URL(response.url);
    const basePath = url.pathname.substring(0, url.pathname.lastIndexOf('/'));
    const baseUrl = `${url.origin}${basePath}`;

    const dash = await response.text();
    const collection = await getDashCollection(dash, baseUrl);

    // Fallback media
    if (redditVideo.fallback_url) {
        const fallback: Media = {
            mime: 'video/mp4',
            variant: Variant.Video,
            href: redditVideo.fallback_url
        };

        if (redditVideo.width) {
            fallback.dimension = { width: +redditVideo.width };
            if (redditVideo.height) fallback.dimension.height = +redditVideo.height;
        }

        collection.push(fallback);
    }
    return collection;
}

/** parses a DASH file and gets the collection */
function getDashCollection(mpdContent: string, baseUrl: string): MediaVariantCollection {
    const collection: MediaVariantCollection = [];
    const parser = new XMLParser({ ignoreAttributes: false });
    const document = parser.parse(mpdContent);
    log('parsed MPD, covnerting to MediaVariantCollection', browser ? document : '');

    if (!('MPD' in document) || document.MPD == null || typeof document.MPD !== 'object') {
        error('mpd file does not contain the root level MPD object', document);
        return [];
    }

    // At this point i gave up on type checking. This hasnt failed yet.
    const MPD = document.MPD;
    const isAudioVideo = MPD.Period.AdaptationSet.length > 0;
    const videoAdaptationSet = isAudioVideo ? MPD.Period.AdaptationSet[0] : MPD.Period.AdaptationSet;
    const audioAdaptationSet = isAudioVideo ? MPD.Period.AdaptationSet[1] : null;

    // Add video sources
    if ('Representation' in videoAdaptationSet && Array.isArray(videoAdaptationSet.Representation)) {
        for (const representation of videoAdaptationSet.Representation) {
            let url = `${baseUrl}/DASH_${representation['@_maxHeight']}.mp4`;
            if ('BaseURL' in representation && typeof representation.BaseURL === 'string')
                url = `${baseUrl}/${representation.BaseURL}`;

            collection.push({
                mime: 'video/mp4',
                variant: Variant.PartialVideo,
                href: url,
                dimension: {
                    width: +(representation['@_width'] || representation['@_maxWidth']),
                    height: +(representation['@_height'] || representation['@_maxHeight'])
                }
            })
        }
    }

    // Add Audio Sources
    if (audioAdaptationSet && 'Representation' in audioAdaptationSet && Array.isArray(audioAdaptationSet.Representation)) {
        for (const representation of audioAdaptationSet.Representation) {
            collection.push({
                mime: 'audio/mp4',
                variant: Variant.PartialAudio,
                href: `${baseUrl}/${representation.BaseURL}`,
            })
        }
    }

    return collection;
}

/** Gets the media collection for post.preview */
async function getPreviewCollection(preview: any): Promise<MediaVariantCollection> {
    let collection: MediaVariantCollection = [];

    // If we have a reddit_video_preview we should fallback on it
    if (hasObject(preview, 'reddit_video_preview')) {
        const videoPreview = preview.reddit_video_preview;
        if ('dash_url' in videoPreview && typeof videoPreview.dash_url === 'string')
            collection = collection.concat(await getRedditVideoCollection(videoPreview as RedditVideo));
    }

    // Load up the images
    if (hasObject(preview, 'images'))
        collection = collection.concat(getPreviewImageCollection(preview.images[0]));

    return collection;
}
/** Gets the collection for post.preview.images */
function getPreviewImageCollection(images: any): MediaVariantCollection {
    let collection: MediaVariantCollection = getPreviewImageCollectionFromObject(images, 'image/jpeg', Variant.Thumbnail);

    // Parse the variants
    if ('variants' in images && images.variants != null && typeof images.variants === 'object') {
        if (hasObject(images.variants, 'gif'))
            collection = collection.concat(getPreviewImageCollectionFromObject(images.variants.gif, 'image/gif', Variant.GIF));
        if (hasObject(images.variants, 'nsfw'))
            collection = collection.concat(getPreviewImageCollectionFromObject(images.variants.nsfw, 'image/jpeg', Variant.Blur));
        if (hasObject(images.variants, 'obfuscated'))
            collection = collection.concat(getPreviewImageCollectionFromObject(images.variants.obfuscated, 'image/jpeg', Variant.Blur));
        if (INCLUDE_MP4_IN_VARIANTS && hasObject(images.variants, 'mp4'))
            collection = collection.concat(getPreviewImageCollectionFromObject(images.variants.mp4, 'video/mp4', Variant.Video));
    }


    debug('parsed a preview.image collection', collection);
    return collection;
}
/** Gets the collections for any { source, variant } object within a preview.images*/
function getPreviewImageCollectionFromObject(images: any, mime: Mime, variant: Variant): MediaVariantCollection {
    function parseMediaObject(data: unknown, mime: Mime, variant: Variant): Media | null {
        if (data == null || typeof data !== 'object') return null;
        if (!('url' in data) || typeof data.url !== 'string') return null;
        const media: Media = { mime, variant, href: data.url };
        if ('width' in data && (typeof data.width === 'string' || typeof data.width === 'number')) {
            media.dimension = { width: +data.width };
            if ('height' in data && (typeof data.height === 'string' || typeof data.height === 'number')) {
                media.dimension.height = +data.height;
            }
        }
        return media;
    }

    const collection: MediaVariantCollection = [];

    // Big preview thumbnail
    if (hasObject(images, 'source')) {
        const sourceMedia = parseMediaObject(images.source, mime, variant);
        if (sourceMedia) collection.push(sourceMedia);
    }

    // All the small thumbnails
    if (hasObject(images, 'resolutions')) {
        for (const obj of images.resolutions) {
            const resMedia = parseMediaObject(obj, mime, variant);
            if (resMedia) collection.push(resMedia);
        }
    }

    return collection;
}

function hasObject(obj: any, key: string): boolean {
    if (obj != null && typeof obj === 'object') {
        return key in obj && obj[key] != null && typeof obj[key] === 'object';
    }
    return false;
}