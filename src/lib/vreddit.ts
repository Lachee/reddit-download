// This bypasses reddit's stupid video format
// source: https://github.com/Guuzzeji/vidzit-dl/blob/main/src/redditFetch.js
import { XMLParser } from 'fast-xml-parser';

export type RedditPost = {
    url : string
    streams : Streams|null
    variants : Variants[]|null
};

export type Variants = {
    image: Variant[],
    blur: Variant[],
    gif: Variant[],
    mp4: Variant[],
}

export type Variant = {
    url : string;
    width : number;
    height : number;
}

type Streams = {
    video : Record<string, VideoStream>,
    audio : Stream
}
type Stream = {
    type: "video"|"audio"
    /** MP4 source URL */
    url: string
}
type VideoStream = Stream & {
    type: "video",
    /** The format (dimension) of the video */
    format : string,
    /** Is this the largest sized video? */
    maxFormat : boolean
}

export async function fetchPost(url : string) : Promise<RedditPost> {
    
    // Fetching base url and dash file from reddit API
    // Return "was not video" error if it cannot find video urls 
    const redditObject = await fetch(`${url}.json`).then(res => res.json());
    const redditPost = redditObject[0].data.children[0].data;
    const result : RedditPost = {
        url:  redditPost.url,
        variants: null,
        streams : null,
    }

    // Load the video
    if (isVideo(redditPost)) {
        const dashURL = redditPost.secure_media.reddit_video.dash_url;
        const dashFile = await fetch(dashURL).then(res => res.text());
        result.streams = await parseDASH(dashFile, result.url);
    }

    // Load the GIF
    if (isImage(redditPost)) {
        result.variants = parseVariants(redditPost);
    }

    return result;
}

function parseDASH(mdpContents : string, baseURL : string) : Streams {
    const parser = new XMLParser({ ignoreAttributes: false });
    const xmlObject = parser.parse(mdpContents);
    const videoFormat : Record<string, VideoStream> = {};

    // @ts-ignore
    xmlObject.MPD.Period.AdaptationSet[0].Representation.forEach(element => {
        const stream = parseVideoStream(element, baseURL);
        videoFormat[stream.format] = stream;
    });

    // Getting max video
    const maxStream = parseVideoStream(xmlObject.MPD.Period.AdaptationSet[0], baseURL);
    videoFormat[maxStream.format] = maxStream;

    return {
        video: videoFormat,
        audio: parseAudioStream(xmlObject.MPD.Period.AdaptationSet[1], baseURL)
    };
}

function parseVideoStream(xml : any, baseURL : string ) : VideoStream {
    return {
        type: "video",
        url: (xml.BaseURL != undefined) ? `${baseURL}/${xml.BaseURL}` : `${baseURL}/DASH_${xml['@_maxHeight']}.mp4`,
        maxFormat: (xml.BaseURL != undefined) ? false : true,
        format: xml['@_height'] || xml['@_maxHeight'],
    };
}

function parseAudioStream(xml : any, baseURL : string) : Stream {
    return {
        type: "audio",
        url: `${baseURL}/${xml.Representation.BaseURL}`,
    };
}

function parseVariants(xml : any) : Variants[] {
    return xml.preview.images.map((img : any) => {
        return {
            images: parseVariantCollection(img),
            gif: parseVariantCollection(img.variants.gif),
            mp4: parseVariantCollection(img.variants.mp4),
            nsfw: parseVariantCollection(img.variants.nsfw),
        }
    });
}

function parseVariantCollection(collection : any) : Variant[] {
    const list : Variant[] = [];
    if (collection == null || collection == undefined)
        return list;
    
    list.push(collection.source as Variant);
    for(const v of collection.resolutions) {
        list.push(v as Variant);
    }
    return list;
}


function isVideo(xml : any) : boolean {
    if (!xml.is_video || xml.secure_media == undefined || xml.secure_media == null) {
        return false;
    }
    return true;
}

function isImage(xml : any) : boolean {
    return xml.preview && xml.preview.images;
}