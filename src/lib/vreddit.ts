// This bypasses reddit's stupid video format
// source: https://github.com/Guuzzeji/vidzit-dl/blob/main/src/redditFetch.js
import { XMLParser } from 'fast-xml-parser';

export type VRedditObject = {
    url : string
    streams : Streams
};

type Streams = {
    video : Record<string, VideoStream>,
    audio : Stream
}

export type Stream = {
    type: "video"|"audio"
    /** MP4 source URL */
    url: string
}

export type VideoStream = Stream & {
    type: "video",
    /** The format (dimension) of the video */
    format : string,
    /** Is this the largest sized video? */
    maxFormat : boolean
}

export async function videos(url : string) : Promise<VRedditObject> {
    let redditVideo;

    // Fetching base url and dash file from reddit API
    // Return "was not video" error if it cannot find video urls 
    try {
        redditVideo = await fetch(url + '.json').then(function (res) {
            return res.json();
        }).then(function (json) {
            let redditAPIData = json[0].data.children[0].data;

            if (isVideo(redditAPIData)) {
                return {
                    baseURL: redditAPIData.url,
                    dashURL: redditAPIData.secure_media.reddit_video.dash_url
                };
            } else {
                throw new Error("Was not a video");
            }
        });
    } catch (e) {
        throw e;
    }

    // Fetching dash XML file
    let dashFile = await fetch(redditVideo.dashURL).then(function (res) {
        return res.text();
    }).then(function (data) {
        return data;
    });

    return {
        url: redditVideo.baseURL,
        streams: parseDASH(dashFile, redditVideo.baseURL)
    };
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

function isVideo(json : any) : boolean {
    if (!json.is_video || json.secure_media == undefined || json.secure_media == null) {
        return false;
    }
    return true;
}