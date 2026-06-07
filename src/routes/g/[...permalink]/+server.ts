import type {RequestHandler} from './$types';
import {fetchPost} from "$lib/reddit/server/Post";
import {getMediaCollection, queryMediaCollection, type Variant, VariantType} from "$lib/reddit/server/Media";
import {convert, type ConvertOptions} from "$lib/server/ffmpeg/Gif";
import {normalizePermalink} from "$lib/reddit/Utilities";
import {cache} from "$lib/server/cache/";
import {probeDuration} from "$lib/server/ffmpeg/Probe";
import type {Cacheable} from "$lib/server/cache/Cache";
import {range} from "$lib/server/Range";
import {redirect} from "@sveltejs/kit";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";
const LongestVideoDuration = 60;

type CachedResponse = ({
    content: Uint8Array<ArrayBuffer>,
    mime: string,
    filename: string,
    status: number,
    error: string | null,
} | { redirect: string });

function findBestVariant(variants: Variant[]): Variant {
    let bestVariant: Variant = variants[0];
    for (const variant of variants) {
        if (variant.type === VariantType.PartialVideo && bestVariant.type != VariantType.PartialVideo)
            bestVariant = variant;

        if (variant.dimension && (!bestVariant.dimension || bestVariant.dimension.width < variant.dimension.width))
            bestVariant = variant;
    }
    return bestVariant;
}

export const GET: RequestHandler = async ({url, params, fetch, request}) => {
    // Return the cached response if it exists / is currently being processed
    const mediaId = url.searchParams.get('media');
    const cached = await cache().getSet<CachedResponse>(['GET', url.pathname, mediaId ?? ''], async () : Promise<CachedResponse> => {
        const post = await fetchPost(fetch, normalizePermalink(params.permalink));
        const collection = await queryMediaCollection(fetch, getMediaCollection(post))

        // Find the best available gif and video
        // We will determine if we should convert the video to a gif by checking if the video is wider than the gif.
        const variants = collection.filter(m => !mediaId || m.id === mediaId).flatMap(m => m.variants)
        const gif = findBestVariant(variants.filter(m => m.type === VariantType.GIF));
        const video = findBestVariant(variants.filter(m => m.type === VariantType.Video || m.type === VariantType.PartialVideo));
        const shouldConvert = video && (!gif || !gif.dimension || (video.dimension && video.dimension.width > gif.dimension.width));
        let convertError = null;

        await new Promise(resolve => setTimeout(resolve, 1000));


        if (shouldConvert && video) {
            // Ensure the video is not too long, otherwise we will not be able to convert it.
            // We will report back any discrepancies in the headers.
            console.log('The best is a video, checking if its eligible for conversion...', video.href);
            const duration = await probeDuration(video.href);
            if (duration <= LongestVideoDuration) {
                const scale = video.dimension?.height || video.dimension?.width || 480;
                const opts: ConvertOptions = {
                    videoPath: video.href,
                    fps: scale > 360 ? 10 : 24,
                    scale: scale,

                    filtering: 'bicubic',
                    dithering: 'bayer:bayer_scale=5',
                    maxColors: 128
                };

                console.log('The best is a video, converting to a gif...', opts);
                const buffer = await convert(opts);
                const filename = `${post.id}-${video.id}.gif`
                return {
                    content: buffer,
                    mime: 'image/gif',
                    filename,
                    status: 200,
                    error: null,
                } satisfies CachedResponse;
            } else {
                console.log('The best is a video, but its too long, skipping conversion', duration);
                convertError = `Video is too long. Cannot convert above ${LongestVideoDuration} seconds.`
            }
        }

        // We did not convert a video, so we will use a fullback gif, otherwise let the image route handle it.
        if (!gif)
            return {redirect: `/i/${post.permalink.substring(3)}?media=${mediaId ?? ''}`} satisfies CachedResponse;

        const {href} = gif;
        console.log("Fetching media from", href)
        const response = await fetch(href, {
            redirect: 'follow',
            headers: {'origin': 'reddit.com', 'User-Agent': UserAgent}
        });

        const bytes = new Uint8Array(await response.arrayBuffer());
        return {
            content: bytes,
            mime: response.headers.get('Content-Type') ?? 'image/gif',
            filename: `${post.id}-${(gif ?? variants[0]).id}.gif`,
            status: response.status,
            error: convertError,
        } satisfies CachedResponse;
    });

    if ('redirect' in cached)
        throw redirect(308, cached.redirect);

    // Prepare the content and try to do a range for iOS playback
    let content = cached.content;
    let status = cached.status;
    let headers: Record<string,string> = {
        "Content-Type": cached.mime,
        "Content-Disposition": `inline; filename="${cached.filename}"`,
        "Cache-Control": "public, max-age=3600",
    }

    if (cached.error)
        headers['X-Error'] = cached.error;

    const slice = range(request, cached.content);
    if (slice) {
        content = slice.slice;
        status = slice.status;
        headers = {
            ...headers,
            ...slice.headers,
        }
    }

    return new Response(content, {status, headers});
}