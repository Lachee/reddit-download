import { type Post } from "$lib/reddit/schema/postSchema";
import { type MediaMetadataItem } from "$lib/reddit/schema/mediaMetadataItemSchema";
import { XMLParser } from 'fast-xml-parser';
import MpdDocumentSchema, { type MpdDocument, type MpdPeriod } from "$lib/reddit/schema/mpdSchema";
import type { Video } from "$lib/reddit/schema/videoSchema";

type Fetch = typeof window.fetch;

export type Mime =
  'image/png' | 'image/jpeg' | 'image/gif' | 'video/mp4' | 'audio/mp4';

export enum Variant {
  /** Presentable actual image */
  Image        = 'image',
  /** Thumbnail static represnetations of an image */
  Thumbnail    = 'thumbnail',
  /** Preview static represnetations of an image */
  Preview      = 'preview',
  /** Blured preview image */
  Blur         = 'blur',
  /** Animated image (GIF) */
  GIF          = 'gif',
  /** Presentable Video */
  Video        = 'video',
  /** Video Clip that requires combining with PartialAudio */
  PartialVideo = 'video_only',
  /** Partial audio channel that needs combing with a VideoClip */
  PartialAudio = 'audio_only',
}

export const VariantOrder = [
  Variant.PartialVideo,
  Variant.Video,
  Variant.GIF,
  Variant.Image,
  Variant.Thumbnail,
  Variant.Preview,
  Variant.PartialAudio,
  Variant.Blur,
];

export type Media = {
  id: string
  mime: Mime
  variant: Variant
  href: string
  dimension?: { width: number, height: number }
}

/** All variants of a single piece of media */
export type MediaCollection = {
  id: string,
  type: string,
  variants: Media[]
}

/** All variants of a single piece of media that isn't yet resolved */
export type MediaCollectionQuery = Omit<MediaCollection, 'variants'> & {
  query: (fetch : Fetch) => Promise<Media[]>
}

export function getMediaCollection(post: Post): (MediaCollection | MediaCollectionQuery)[] {
  if (post === undefined)
    throw new Error('post is undefined');

  const media: (MediaCollection | MediaCollectionQuery)[] = [];

  // Get media variants
  if (post.media_metadata) {
    const galleryCollections = getAllMediaCollectionsFromMetadata(post.media_metadata);
    if (post.gallery_data && post.gallery_data.items) {
      // TODO: Sort
      media.push(...galleryCollections)
    } else {
      // We have no way to sort this so just slap it in.
      media.push(...galleryCollections)
    }
  }

  // Secure Media
  if (post.secure_media && post.secure_media.reddit_video) {
    if (post.secure_media.reddit_video.fallback_url) {
      media.push({
        id: post.secure_media.reddit_video.fallback_url,
        type: 'secure_video.fallback',
        variants: [{
          id:        post.secure_media.reddit_video.fallback_url,
          mime:      'video/mp4',
          variant:   Variant.Video,
          href:      post.secure_media.reddit_video.fallback_url,
          dimension: post.secure_media.reddit_video.width || post.secure_media.reddit_video.height ? {
            width:  post.secure_media.reddit_video.width ?? 0,
            height: post.secure_media.reddit_video.height ?? 0
          } : undefined
        }]
      })
    }
    media.push({
      id: post.secure_media.reddit_video.fallback_url!,
      type: 'secure_video',
      query: (fetch) =>  fetchDashMediaFromRedditVideo(fetch, post.secure_media!.reddit_video!)
    });
  }

  // Preview Media
  if (post.preview) {
    if (post.preview.reddit_video_preview) {
      if (post.preview.reddit_video_preview.fallback_url) {
        media.push({
          id: post.preview.reddit_video_preview.fallback_url,
          type: 'preview_video.fallback',
          variants: [{
            id:        post.preview.reddit_video_preview.fallback_url,
            mime:      'video/mp4',
            variant:   Variant.Video,
            href:      post.preview.reddit_video_preview.fallback_url,
            dimension: post.preview.reddit_video_preview.width || post.preview.reddit_video_preview.height ? {
              width:  post.preview.reddit_video_preview.width ?? 0,
              height: post.preview.reddit_video_preview.height ?? 0
            } : undefined
          }]
        })
      }
      media.push({
        id: post.preview.reddit_video_preview.fallback_url!,
        type: 'preview_video',
        query: (fetch) => fetchDashMediaFromRedditVideo(fetch, post.preview!.reddit_video_preview!)
      });
    }

    // TODO: Preview image collection
  }

  // Thumbnail
  if (post.thumbnail) {
    media.push({
      id: post.id,
      type: 'thumbnail',
      variants: [{
        id:      post.id,
        mime:    'image/jpeg',
        variant: Variant.Thumbnail,
        href:    post.thumbnail,
      }]
    })
  }

  // URL Override
  if ('url_overridden_by_dest' in post && typeof post.url_overridden_by_dest === 'string') {
    const overridden: string = post.url_overridden_by_dest;
    if (overridden.includes('.', overridden.lastIndexOf('/'))) {
      const ext = extname(overridden);
      const overriddenMedia: Media = {
        id:      post.id,
        mime:    'image/' + (ext == 'jpg' ? 'jpeg' : ext) as Mime,
        variant: Variant.Image,
        href:    overridden
      };
      if (ext == 'gif') {
        overriddenMedia.variant = Variant.GIF;
      } else if (ext == 'mp4') {
        overriddenMedia.mime = 'video/mp4';
        overriddenMedia.variant = Variant.Video;
      }
      media.push({
        id: post.id,
        type: 'overridden',
        variants: [overriddenMedia]
      });
    }
  }

  // TODO: Handle Imgur

  return media;
}

/** fetches all the metadata of a post's media.
 * Any DASH manifests are downloaded and parsed.
 * @param post
 */
export async function fetchMedia(fetch: Fetch, post: Post): Promise<Media[]> {
  const media: Media[] = [];
  const collections = getMediaCollection(post);

  for (const collection of collections) {
    if ('query' in collection) {
      const collectionMedia = await collection.query(fetch);
      media.push(...collectionMedia);
    } else {
      media.push(...collection.variants);
    }
  }

  return media;
}

export function sort(media: Media[], order: Variant[] = VariantOrder): Media[] {
  const sorted = order ?? VariantOrder;

  return [ ...media ].sort((a: Media, b: Media) => {
    const variantDiff = sorted.indexOf(a.variant) - sorted.indexOf(b.variant);
    if (variantDiff !== 0)
      return variantDiff;

    const aWidth = a.dimension?.width ?? 0;
    const bWidth = b.dimension?.width ?? 0;
    return bWidth - aWidth;
  });
}

/**
 * Gets all the media collections that are defined in the metadata.
 * @param metadata
 */
function getAllMediaCollectionsFromMetadata(metadata: Record<string, MediaMetadataItem>): MediaCollection[] {
  const gallery: Record<string, Media[]> = {};

  for (const [ id, item ] of Object.entries(metadata)) {
    if (item.status !== 'valid') continue;
    if (!item.s) continue;

    // reddit uses the invalid image/jpg, we need to fix it.
    const mime = (item.m === 'image/jpg' ? 'image/jpeg' : item.m) as Mime;
    const collection: Media[] = [];
    gallery[id] = collection;

    // Process the main served media
    if (item.s.mp4 && mime !== 'image/gif') {
      collection.push({
        id,
        mime:      mime,
        variant:   Variant.Video,
        href:      item.s.mp4,
        dimension: item.s.x || item.s.y ? { width: item.s.x ?? 0, height: item.s.y ?? 0 } : undefined
      });
    }

    if (item.s.gif) {
      collection.push({
        id,
        mime:      mime,
        variant:   Variant.GIF,
        href:      item.s.gif,
        dimension: item.s.x || item.s.y ? { width: item.s.x ?? 0, height: item.s.y ?? 0 } : undefined
      })
    }

    if (item.s.u) {
      collection.push({
        id,
        mime:      mime,
        variant:   Variant.Image,
        href:      item.s.u,
        dimension: item.s.x || item.s.y ? { width: item.s.x ?? 0, height: item.s.y ?? 0 } : undefined
      })
    }

    // Process the pushed media
    if (item.p) {
      for (const subItem of item.p) {
        if (subItem.u) {
          collection.push({
            id,
            mime:      mime,
            variant:   Variant.Image,
            href:      subItem.u,
            dimension: subItem.x || subItem.y ? { width: subItem.x ?? 0, height: subItem.y ?? 0 } : undefined
          })
        }
      }
    }

    // Process the blurs
    if ('o' in item && Array.isArray(item.o)) {
      for (const blur of item.o) {
        if (blur.u) {
          collection.push({
            id,
            mime:      mime,
            variant:   Variant.Blur,
            href:      blur.u,
            dimension: blur.x ? { width: blur.x, height: blur.y } : undefined
          })
        }
      }
    }
  }

  return Object.entries(gallery).map(([name, media]) => ({ id: name, type:'gallery', variants: media })) satisfies MediaCollection[];
}

/** Downloads and parses the DASH manifest from the secure_media.reddit_video.dash_url. */
async function fetchDashMediaFromRedditVideo(fetch: Fetch, redditVideo: Video): Promise<Media[]> {

  if (!redditVideo.dash_url)
    throw new Error('SecureMedia does not contain a dash_url');

  const response = await fetch(redditVideo.dash_url);
  const dash = await response.text();
  const url = new URL(response.url);
  const basePath = url.pathname.substring(0, url.pathname.lastIndexOf('/'));
  const baseUrl = `${url.origin}${basePath}`;
  return parseMediaFromDash(dash, baseUrl);
}

/** Parses the DASH manifest and returns the media sources. */
function parseMediaFromDash(mpdContent: string, baseUrl: string): Media[] {
  const flattenArrayable = <T>(arg: T | T[]): T => Array.isArray(arg) ? arg[0] : arg;
  const fattenArrayable = <T>(arg: T | T[]): T[] => Array.isArray(arg) ? arg : [ arg ];

  const media: Media[] = [];
  const parser = new XMLParser({ ignoreAttributes: false });
  const xmlDocument = parser.parse(mpdContent);
  const mpdDocument = MpdDocumentSchema.parse(xmlDocument);

  const MPD = mpdDocument.MPD;
  const period: MpdPeriod = flattenArrayable(MPD.Period);
  const adaptationSet = period.AdaptationSet;

  const isAudioVideo = adaptationSet.length > 0;
  const videoAdaptationSet = flattenArrayable(isAudioVideo ? adaptationSet[0] : adaptationSet);
  const audioAdaptationSet = flattenArrayable(isAudioVideo ? adaptationSet[1] : null);

  // Add video sources
  if (videoAdaptationSet && videoAdaptationSet.Representation) {
    for (const representation of fattenArrayable(videoAdaptationSet.Representation)) {
      const width = +(representation['@_width'] ?? representation['@_maxWidth'] ?? 0);
      const height = +(representation['@_height'] ?? representation['@_maxHeight'] ?? 0);

      const repBaseUrl = flattenArrayable(representation.BaseURL);
      const url = `${baseUrl}/${repBaseUrl}`

      media.push({
        id:        representation['@_id'] ?? '',
        mime:      'video/mp4',
        variant:   Variant.PartialVideo,
        href:      url,
        dimension: {
          width:  +(width ?? 0),
          height: +(height ?? 0)
        }
      })
    }
  }

  // Add Audio Sources
  if (audioAdaptationSet && audioAdaptationSet.Representation) {
    for (const representation of fattenArrayable(audioAdaptationSet.Representation)) {
      media.push({
        id:      representation['@_id'] ?? '',
        mime:    'audio/mp4',
        variant: Variant.PartialAudio,
        href:    `${baseUrl}/${representation.BaseURL}`,
      })
    }
  }

  return media;
}

/**
 * Gets the extension of the given file
 * @param filePath
 * @returns
 */
function extname(filePath: string): string {
  const i = filePath.lastIndexOf('.');
  if (i < 0) return '';
  return filePath.substring(i + 1);
}