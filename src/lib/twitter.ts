import twitterGetUrl from 'twitter-url-direct';

export type Type = 'video/gif'|'video/mp4'|'image'

export type TwitterPost = {
    tweet : Tweet,
    type: Type,
    download: string,
}

export type TwitterVideoPost = {
    downloads: Download[],
    duration: number
}

export type Tweet = {
    name: string,
    username: string,
    text: string,

}

export type Download = {
    width: number,
    height: number,
    dimension: string,
    url: string
}

export async function fetchPost(url : string) : Promise<TwitterPost> {
    const result = await twitterGetUrl(url);
    if (!result.found)
        throw new Error('Could not find the twitter post');

    console.log(result);
    return null;
}