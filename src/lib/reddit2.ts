import { stripQueryParameters } from './helpers';

/** Root Domains reddit operates */
export const Domains = [
    'reddit.com',
    'redd.it',
    'redditstatic.com',
    'redditmedia.com',
];

export type Post = {
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
    'image/png' | 'image/jpeg' | 'image/gif' | 'video/mp4';

export type Variant =
    'image' | 'blur' | 'gif' | 'video' | 'audio' | 'thumbnail';

export type MediaVariantCollection = Media[];

export type Media = {
    mime: Mime;
    variant: Variant;
    href: string;

    /** Size of the media */
    dimension?: { width: number, height?: number }
}

function log(...args: any[]) {
    console.log('[REDDIT]', ...args);
}
function error(...args: any[]) {
    console.error('[REDDIT]', ...args);
}

/** Follows the shortened links */
async function follow(url: string): Promise<string> {
    const shareLinkRegex = /reddit.com\/r\/\w*\/s\//
    if (!shareLinkRegex.test(url))
        return stripQueryParameters(url);

    const response = await fetch('/follow?get=' + encodeURIComponent(url));
    url = await response.text();
    return stripQueryParameters(url);
}

/**
 * Gets a reddit post, collating all the appropriate media
 * @param url the link to the reddit post
 * @returns 
 */
export async function getPost(url: string): Promise<Post> {
    url = await follow(url);
    const data = await fetch(`${url}.json?raw_json=1`)
        .then(res => res.json())
        .then(dat => dat[0].data.children[0].data)
        .then(pos => pos.crosspost_parent_list && pos.crosspost_parent_list.length > 0 ? pos.crosspost_parent_list[pos.crosspost_parent_list.length - 1] : pos);

    log('downloaded json, parsing: ', data);
    const permalink = `https://www.reddit.com${data.permalink}`;
    const post: Post = {
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
    if (data.thumbnail) {
        post.thumbnail = {
            mime: 'image/jpeg',
            variant: 'thumbnail',
            href: data.thumbnail
        };

        if (data.thumbnail_width) {
            post.thumbnail.dimension = { width: +data.thumbnail_width };
            if (data.thumbnail_height)
                post.thumbnail.dimension.height = +data.thumbnail_height;
        }
    }

    log('parsed post: ', post);
    return post;
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
        const previewCollection = getPreviewCollection(data.preview);
        collections.push(previewCollection);
    }

    log('parsed all collections:', collections);
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
        collection.push(getMediaMetadataMediaFromObject(meta.s, mime, 'image'));

        // Push the previews
        if ('p' in meta && Array.isArray(meta.p)) {
            for (const previewData of meta.p)
                collection.push(getMediaMetadataMediaFromObject(previewData, 'image/jpeg', 'thumbnail'))
        }

        // Push the blurs
        if ('o' in meta && Array.isArray(meta.o)) {
            for (const blurData of meta.o)
                collection.push(getMediaMetadataMediaFromObject(blurData, 'image/jpeg', 'blur'))
        }

        // Pusht he collection
        collections.push(collection);
    }

    log('parsed media_metadata collections:', collections);
    return collections;
}
/** gets the individual media object from within a media_collection's variants */
function getMediaMetadataMediaFromObject(data : unknown, defaultMime: Mime, defaultVaraint: Variant): Media {
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
        media.variant = 'gif';
        media.mime = 'image/gif'
    } else if ('mp4' in data && typeof data.mp4 === 'string') {
        media.href = data.mp4;
        media.variant = 'video';
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
    if ('url' in media && 'mime' in media && 'variant' in media)
        return media as Media;

    error('missing critical fields in the media from the metadata', media, data);
    throw new Error('failed to find any media in the metadata object');
}

/** Gets the media collection for post.preview */
function getPreviewCollection(preview: any): MediaVariantCollection {
    if ('images' in preview && preview.images != null)
        return getPreviewImageCollection(preview.images[0]);

    error('unkown type of preview collection', preview);
    throw new Error('unkown type of preview collection');
}
/** Gets the collection for post.preview.images */
function getPreviewImageCollection(images: any): MediaVariantCollection {

    let  collection : MediaVariantCollection = getPreviewImageCollectionFromObject(images, 'image/jpeg', 'thumbnail');

    // Parse the variants
    if ('variants' in images && images.variants != null && typeof images.variants === 'object') {
        if ('gif' in images.variants && images.variants.gif != null && typeof images.variants.gif === 'object')
            collection = collection.concat(getPreviewImageCollectionFromObject(images.variants.gif, 'image/gif', 'gif'));
        if ('mp4' in images.variants && images.variants.mp4 != null && typeof images.variants.mp4 === 'object')
            collection = collection.concat(getPreviewImageCollectionFromObject(images.variants.mp4, 'video/mp4', 'video'));
    }


    return collection;
}

/** Gets the collections for any { source, variant } object within a preview.images*/
function getPreviewImageCollectionFromObject(images : any, mime : Mime, variant : Variant) : MediaVariantCollection {
    function parseMediaObject(data : unknown, mime : Mime, variant : Variant) : Media|null { 
        if (data == null || typeof data !== 'object') return null;
        if (!('url' in data) || typeof data.url !== 'string') return null;        
        const media : Media = { mime, variant, href: data.url };
        if ('width' in data && (typeof data.width === 'string' || typeof data.width === 'number')) {
            media.dimension = { width: +data.width };
            if ('height' in data && (typeof data.height  === 'string' || typeof data.height === 'number')) {
                media.dimension.height = +data.height;
            }
        }
        return media;
    }

    const collection : MediaVariantCollection = [];
    
    // Big preview thumbnail
    if ('source' in images && images.source != null && typeof images.source === 'object') {
        const sourceMedia = parseMediaObject(images.source, mime, variant);
        if (sourceMedia) collection.push(sourceMedia);
    }

    // All the small thumbnails
    if ('resolutions' in images && images.resolutions != null && Array.isArray(images.resolutions)) {
        log('resolutions',  images.resolutions);
        for (const obj of images.resolutions) {
            const resMedia = parseMediaObject(obj,  mime, variant);
            if (resMedia) collection.push(resMedia);
        }
    }

    return collection;
} 