// This bypasses reddit's stupid video format
// source: https://github.com/Guuzzeji/vidzit-dl/blob/main/src/redditFetch.js
import { XMLParser } from 'fast-xml-parser';



export const RedditDomains = [
    'reddit.com',
    'redd.it',
    'redditstatic.com',
    'redditmedia.com',
];

export type RedditPost = {
    /** The address the post points too */
    url: string
    /** The permalink to the post */
    permalink: string
    /** unique identifier for hte post */
    name: string
    /** The post is marked NSFW */
    nsfw: boolean
    /** The subreddit it's from */
    subreddit: string
    /** Title of the post */
    title: string
    /** The base url for the vreddit videos */
    vBaseUrl: string
    /** Preview image */
    thumbnail: string,
    /** Video & Audio streams */
    streams: Streams | null,
    /** Variants */
    variants: Variants[] | null,
};

export type Variants = {
    image: Variant[],
    blur: Variant[],
    gif: Variant[],
    mp4: Variant[],
}

export type Variant = {
    url: string;
    width: number;
    height: number;
}

export type Streams = {
    video: Record<string, VideoStream>,
    audio: Stream | null,
}
export type Stream = {
    type: "video" | "audio"
    /** MP4 source URL */
    url: string
}
export type VideoStream = Stream & {
    type: "video",
    /** The format (dimension) of the video */
    format: string,
    /** Is this the largest sized video? */
    maxFormat: boolean
}

export function trimParameters(url: string): string {
    const indexOfParam = url.indexOf("?");
    if (indexOfParam > 0) return url.slice(0, indexOfParam - 1);
    const indexOfJson = url.indexOf('.json');
    if (indexOfJson > 0) return url.slice(0, indexOfJson - 1);
    return url;
}

/** Follows any URL shortening that reddit does. */
async function followPostURL(url: string): Promise<string> {
    const shareLinkRegex = /reddit.com\/r\/\w*\/s\//
    if (!shareLinkRegex.test(url))
        return trimParameters(url);

    const response = await fetch('/follow?get=' + encodeURIComponent(url));
    url = await response.text();
    return trimParameters(url);
}

export async function fetchPost(url: string): Promise<RedditPost> {

    // Fetching base url and dash file from reddit API
    // Return "was not video" error if it cannot find video urls 
    url = await followPostURL(url);
    const rawPost = await fetch(`${url}.json?raw_json=1`)
        .then(res => res.json())
        .then(dat => dat[0].data.children[0].data);

    if (rawPost.crosspost_parent_list && rawPost.crosspost_parent_list.length > 0) {
        const crossPost = rawPost.crosspost_parent_list[rawPost.crosspost_parent_list.length - 1];
        return await fetchPost(`https://www.reddit.com${crossPost.permalink}`)
    }

    const permalink = `https://www.reddit.com${rawPost.permalink}`;
    const post: RedditPost = {
        url: rawPost.url || permalink,
        permalink: permalink,
        name: rawPost.name,
        subreddit: rawPost.subreddit,
        title: rawPost.title,
        nsfw: rawPost.over_18,

        thumbnail: rawPost.thumbnail,

        vBaseUrl: rawPost.url,
        variants: null,
        streams: null,
    }

    // We are not the root post, lets delve deeper if its a reddit post
    if (!post.url.startsWith(post.permalink) && post.url.startsWith("https://www.reddit.com")) {
        console.log('getting cross-post');
        return await fetchPost(rawPost.url);
    }

    // Load the video
    if (isVideo(rawPost)) {
        post.streams = await parseStreamsAsync(rawPost);
    }

    // Load the GIF
    if (isImage(rawPost)) {
        post.variants = parseVariants(rawPost);
    }

    return post;
}

async function parseStreamsAsync(xml : any): Promise<Streams> {    

    if (xml.preview && xml.preview.reddit_video_preview) {
        const stream = xml.preview.reddit_video_preview;
        return {
            audio: null,
            video: {
                "default": {
                    format: "default",
                    maxFormat: true,
                    type: "video",
                    url: stream.fallback_url
                }
            }
        }
    } 
    
    const dashURL = xml.secure_media.reddit_video.dash_url;
    const dashFile = await fetch(dashURL).then(res => res.text());
    return await parseDASH(dashFile, xml.url);
}

function parseDASH(mdpContents: string, baseURL: string): Streams {
    const parser = new XMLParser({ ignoreAttributes: false });
    const xmlObject = parser.parse(mdpContents);
    const videoFormat: Record<string, VideoStream> = {};
    console.log('Parsing DASH file', xmlObject);
    
    const isAudioVideo = xmlObject.MPD.Period.AdaptationSet.length > 0;
    const videoAdaptationSet = isAudioVideo ? xmlObject.MPD.Period.AdaptationSet[0] : xmlObject.MPD.Period.AdaptationSet;
    const audioAdaptationSet = isAudioVideo ? xmlObject.MPD.Period.AdaptationSet[1] : null;
    
    // @ts-ignore
    videoAdaptationSet.Representation.forEach(element => {
        const stream = parseVideoStream(element, baseURL);
        videoFormat[stream.format] = stream;
    });

    // Getting max video
    const maxStream = parseVideoStream(videoAdaptationSet, baseURL);
    videoFormat[maxStream.format] = maxStream;
    
    return {
        video: videoFormat,
        audio: isAudioVideo ? parseAudioStream(audioAdaptationSet, baseURL) : null
    };
}

function parseVideoStream(xml: any, baseURL: string): VideoStream {
    return {
        type: "video",
        url: (xml.BaseURL != undefined) ? `${baseURL}/${xml.BaseURL}` : `${baseURL}/DASH_${xml['@_maxHeight']}.mp4`,
        maxFormat: (xml.BaseURL != undefined) ? false : true,
        format: xml['@_height'] || xml['@_maxHeight'],
    };
}

function parseAudioStream(xml: any, baseURL: string): Stream|null {
    let representation = xml.Representation;
    if (representation == null) 
        return null;

    // If the audio representations are an array, we will get the last item from that arrray.
    if (representation[0] !== undefined && typeof representation[0] === 'object' && representation.length) {        
        representation = representation[representation.length - 1];        
        if (representation == null) 
            return null;
    }

    // Build the audio stream fromt he given representation
    return {
        type: "audio",
        url: `${baseURL}/${representation.BaseURL}`,
    };
}

function parseVariants(xml: any): Variants[] {
    return xml.preview.images.map((img: any) => {
        return {
            image: parseVariantCollection(img),
            gif: parseVariantCollection(img.variants.gif),
            mp4: parseVariantCollection(img.variants.mp4),
            blur: parseVariantCollection(img.variants.nsfw),
        }
    });
}

function parseVariantCollection(collection: any): Variant[] {
    const list: Variant[] = [];
    if (collection == null || collection == undefined)
        return list;

    list.push(collection.source as Variant);
    for (const v of collection.resolutions) {
        list.push(v as Variant);
    }
    return list;
}

function isVideo(xml: any): boolean {
    if (xml.preview && xml.preview.reddit_video_preview) 
        return true;

    if (!xml.is_video || xml.secure_media == undefined || xml.secure_media == null) {
        return false;
    }
    return true;
}

function isImage(xml: any): boolean {
    return xml.preview && xml.preview.images;
}
