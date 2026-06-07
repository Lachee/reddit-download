import type {RequestHandler} from './$types';
import {fetchPost} from "$lib/reddit/server/Post";
import {
    queryMediaCollection,
    type Variant,
    VariantType,
    getMediaCollection,
} from "$lib/reddit/server/Media";
import {combine} from "$lib/server/ffmpeg/Combine";
import {normalizePermalink} from "$lib/reddit/Utilities";
import {cache} from "$lib/server/cache/";
import type {Cacheable} from "$lib/server/cache/Cache";
import {range} from "$lib/server/Range";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

interface CachedResponse extends Cacheable {
    content: Uint8Array<ArrayBuffer>,
    mime: string,
    filename: string,
    status: number
}

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
    const mediaId = url.searchParams.get('media');
    const cached = await cache().getSet<CachedResponse>(['GET', url.pathname, mediaId ?? ''], async () => {
        const post = await fetchPost(fetch, normalizePermalink(params.permalink));
        const collection = await queryMediaCollection(fetch, getMediaCollection(post))
        const variants = collection.filter(m => !mediaId || m.id === mediaId).flatMap(m => m.variants)
            .filter(
                v => v.type === VariantType.Video
                    || v.type === VariantType.PartialVideo
                    || v.type === VariantType.PartialAudio
            );

        const best = findBestVariant(variants);
        if (best.type === VariantType.PartialVideo) {
            const video = best;
            const audio = variants.find(m => m.type === VariantType.PartialAudio);
            if (audio) {
                const buffer = await combine({
                    videoPath: video.href,
                    audioPath: audio.href,
                });

                const filename = `${post.id}-${video.id}.mp4`
                return {
                    content: buffer,
                    mime: 'video/mp4',
                    filename,
                    status: 200
                } satisfies CachedResponse;
            }
        }

        // Otherwise, use the best gif or whatever we have as a fallback
        const {href} = best;
        const response = await fetch(href, {
            redirect: 'follow',
            headers: {'origin': 'reddit.com', 'User-Agent': UserAgent}
        });

        // It's unclear if we actually need to cache this or if we can just store zero bytes, forcing new requests.
        const bytes = new Uint8Array(await response.arrayBuffer());
        return {
            content: bytes,
            mime: response.headers.get('Content-Type') ?? 'video/mp4',
            filename: `${post.id}-${best.id}.mp4`,
            status: response.status
        }
    });

    // Prepare the content and try to do a range for iOS playback
    let content = cached.content;
    let status = cached.status;
    let headers = {
        "Content-Type": cached.mime,
        "Content-Disposition": `inline; filename="${cached.filename}"`,
        "Cache-Control": "public, max-age=3600",
    }

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
};