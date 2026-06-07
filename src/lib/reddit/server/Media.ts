import { type Post } from "$lib/reddit/schema/postSchema";
import { type MediaMetadataItem } from "$lib/reddit/schema/mediaMetadataItemSchema";
import { XMLParser } from 'fast-xml-parser';
import MpdDocumentSchema, { type MpdPeriod } from "$lib/reddit/schema/mpdSchema";
import type { Video } from "$lib/reddit/schema/videoSchema";
import type { PreviewImage, PreviewImageVariant } from "$lib/reddit/schema/previewImageSchema";
import { fetchOembedVariants } from "$lib/reddit/server/third-party/index";

type Fetch = typeof window.fetch;

export type Mime =
  'image/png' | 'image/jpeg' | 'image/gif' | 'video/mp4' | 'audio/mp4';

export enum VariantType {
  /** Presentable actual image */
  Image        = 'image',
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
  VariantType.GIF,
  VariantType.PartialVideo,
  VariantType.Video,
  VariantType.Image,
  VariantType.PartialAudio,
  VariantType.Blur,
];

export type Variant = {
  id: string
  mime: Mime
  type: VariantType
  href: string
  dimension?: { width: number, height: number }
}

export enum MediaType {
  SecureVideo  = 'secure_video',
  PreviewVideo = 'preview_video',
  PreviewImage = 'preview_image',
  Gallery      = 'gallery',
  Overridden   = 'overridden',
  Thumbnail    = 'thumbnail',
}

/** All variants of a single piece of media */
export type Media = {
  /** The ID of the media. This is used to group media together. */
  id: string,
  /** Type of the collection. Gallery image, Secure Media, etc */
  type: MediaType,
  /** The optional sorting. If multiple items are present this can be used to show in the correct order. */
  sort?: number,
  /** All the variants of the media */
  variants: Variant[]
}

/** All variants of a single piece of media that isn't yet resolved */
export type QueryableMedia = Media & {
  query: (fetch: Fetch) => Promise<Variant[]>
}

export type QueryableMediaCollection = (Media | QueryableMedia)[];
export type MediaCollection = Media[];

export function getMediaCollection(post: Post): QueryableMediaCollection {
  if (post === undefined)
    throw new Error('post is undefined');

  const media: QueryableMediaCollection = [];

  // Gallery variants
  if (post.media_metadata) {
    const mediaCollection = getMediaCollectionFromMetadata(post.media_metadata);
    if (post.gallery_data && post.gallery_data.items) {
      // The post comes with specific information on how to sort this, so lets add the sort number
      for (const variants of mediaCollection) {
        const galleryItem = post.gallery_data.items.find(item => item.media_id === variants.id)
        if (galleryItem !== undefined) {
          variants.sort = galleryItem.id;
        }
      }

      const INF = 1e9;
      mediaCollection.sort((a, b) => (a.sort ?? INF) - (b.sort ?? INF));
    }
    media.push(...mediaCollection)
  }

  // Secure Media
  if (post.secure_media) {
    if (post.secure_media.reddit_video) {
      const secureMedia: QueryableMedia = {
        id:       post.id,
        type:     MediaType.SecureVideo,
        variants: [],
        query:    (fetch) => fetchDashMediaFromRedditVideo(fetch, post.secure_media!.reddit_video!)
      };

      if (post.secure_media.reddit_video.fallback_url) {
        secureMedia.variants.push({
          id:        post.secure_media.reddit_video.fallback_url,
          mime:      'video/mp4',
          type:      VariantType.Video,
          href:      post.secure_media.reddit_video.fallback_url,
          dimension: post.secure_media.reddit_video.width || post.secure_media.reddit_video.height ? {
            width:  post.secure_media.reddit_video.width ?? 0,
            height: post.secure_media.reddit_video.height ?? 0
          } : undefined
        });
      }

      media.push(secureMedia);
    } else if (post.secure_media.oembed) {
      const oembedMedia : QueryableMedia = {
        id: post.id,
        type: MediaType.SecureVideo,
        variants: [],
        query: (fetch) => fetchOembedVariants(fetch, post.secure_media!.oembed!)
      }

      if (post.secure_media.oembed.thumbnail_url) {
        oembedMedia.variants.push({
          id: post.id,
          mime: 'image/jpeg',
          type: VariantType.Image,
          href: post.secure_media.oembed.thumbnail_url,
          dimension: post.secure_media.oembed.width || post.secure_media.oembed.height ? {
            width: post.secure_media.oembed.width ?? 0,
            height: post.secure_media.oembed.height ?? 0
          } : undefined
        });
      }

      media.push(oembedMedia);
    }
  }

  // Preview Media
  if (post.preview) {
    if (post.preview.reddit_video_preview) {
      const previewMedia: QueryableMedia = {
        id:       post.id,
        type:     MediaType.PreviewVideo,
        variants: [],
        query:    (fetch) => fetchDashMediaFromRedditVideo(fetch, post.preview!.reddit_video_preview!)
      }
      if (post.preview.reddit_video_preview.fallback_url) {
        previewMedia.variants.push({
          id:        post.preview.reddit_video_preview.fallback_url,
          mime:      'video/mp4',
          type:      VariantType.Video,
          href:      post.preview.reddit_video_preview.fallback_url,
          dimension: post.preview.reddit_video_preview.width || post.preview.reddit_video_preview.height ? {
            width:  post.preview.reddit_video_preview.width ?? 0,
            height: post.preview.reddit_video_preview.height ?? 0
          } : undefined
        })
      }
      media.push(previewMedia);
    }

    if (post.preview.images) {
      const previewCollection = getMediaCollectionFromPreview(post.preview.images);
      media.push(...previewCollection);
    }
  }

  // Thumbnail
  if (post.thumbnail) {
    media.push({
      id:       post.id,
      type:     MediaType.Thumbnail,
      variants: [ {
        id:        post.id,
        mime:      'image/jpeg',
        type:      VariantType.Image,
        href:      post.thumbnail,
        dimension: post.thumbnail_width ? {
          width:  post.thumbnail_width ?? 0,
          height: post.thumbnail_height ?? 0
        } : undefined
      } ]
    })
  }

  // "Overriden" media
  if ('url_overridden_by_dest' in post && typeof post.url_overridden_by_dest === 'string') {
    const overridden: string = post.url_overridden_by_dest;
    if (overridden.includes('.', overridden.lastIndexOf('/'))) {
      const ext = extname(overridden);
      const overriddenMedia: Variant = {
        id:   post.id,
        mime: 'image/' + (ext == 'jpg' ? 'jpeg' : ext) as Mime,
        type: VariantType.Image,
        href: overridden
      };
      if (ext == 'gif') {
        overriddenMedia.type = VariantType.GIF;
      } else if (ext == 'mp4') {
        overriddenMedia.mime = 'video/mp4';
        overriddenMedia.type = VariantType.Video;
      }
      media.push({
        id:       post.id,
        type:     MediaType.Overridden,
        variants: [ overriddenMedia ]
      });
    }
  }

  // TODO: Handle Imgur

  return media;
}

/**
 * fetches all the metadata of a post's media.
 * Any DASH manifests are downloaded and parsed.
 */
export async function queryMediaCollection(svelteFetch: Fetch, collection: QueryableMediaCollection): Promise<MediaCollection> {
  console.log('querying media collection', collection);
  const queryable: Promise<Media>[] = collection.filter(c => 'query' in c)
    .map(c => Promise.resolve().then(
        async () => ({
          id:       c.id,
          type:     c.type,
          variants: [
            ...c.variants,
            ...await c.query(fetch)
          ]
        })
      )
    );

  const media = await Promise.all(queryable);
  media.push(...collection.filter(c => !('query' in c)));
  return media;
}

export function sort(variants: Variant[], order: VariantType[] = VariantOrder): Variant[] {
  const sorted = order ?? VariantOrder;

  return [ ...variants ].sort((a: Variant, b: Variant) => {
    const variantDiff = sorted.indexOf(a.type) - sorted.indexOf(b.type);
    if (variantDiff !== 0)
      return variantDiff;

    const aArea = (a.dimension?.width ?? 0) * (a.dimension?.height ?? 0);
    const bArea = (b.dimension?.width ?? 0) * (b.dimension?.height ?? 0);
    return bArea - aArea;
  });
}

/**
 * Gets all the media collections that are defined in the metadata.
 * @param metadata
 */
function getMediaCollectionFromMetadata(metadata: Record<string, MediaMetadataItem>): QueryableMediaCollection {
  const gallery: Record<string, Variant[]> = {};

  for (const [ id, item ] of Object.entries(metadata)) {
    if (item.status !== 'valid') continue;
    if (!item.s) continue;

    // reddit uses the invalid image/jpg, we need to fix it.
    const mime = (item.m === 'image/jpg' ? 'image/jpeg' : item.m) as Mime;
    const collection: Variant[] = [];
    gallery[id] = collection;

    // Process the main served media
    if (item.s.mp4 && mime !== 'image/gif') {
      collection.push({
        id,
        mime:      mime,
        type:      VariantType.Video,
        href:      item.s.mp4,
        dimension: item.s.x || item.s.y ? { width: item.s.x ?? 0, height: item.s.y ?? 0 } : undefined
      });
    }

    if (item.s.gif) {
      collection.push({
        id,
        mime:      mime,
        type:      VariantType.GIF,
        href:      item.s.gif,
        dimension: item.s.x || item.s.y ? { width: item.s.x ?? 0, height: item.s.y ?? 0 } : undefined
      })
    }

    if (item.s.u) {
      collection.push({
        id,
        mime:      mime,
        type:      VariantType.Image,
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
            type:      VariantType.Image,
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
            type:      VariantType.Blur,
            href:      blur.u,
            dimension: blur.x ? { width: blur.x, height: blur.y } : undefined
          })
        }
      }
    }
  }

  return Object.entries(gallery).map(([ name, media ]) => ({
    id:       name,
    type:     MediaType.Gallery,
    variants: media
  })) satisfies Media[];
}

function getMediaCollectionFromPreview(images: PreviewImage[]): MediaCollection {
  const collection: Media[] = [];

  const pushVariant = (id: string, variants: Variant[], image: PreviewImageVariant, mime: string, type: VariantType) => {
    variants.push({
      id:        id,
      type:      type,
      href:      image.source.url,
      mime:      mime as Mime,
      dimension: { width: image.source.width, height: image.source.height }
    });

    for (const resolution of image.resolutions) {
      variants.push({
        id:        id,
        type:      type,
        href:      resolution.url,
        mime:      mime as Mime,
        dimension: { width: resolution.width, height: resolution.height }
      });
    }
  }

  for (const image of images) {
    const media: Media = {
      id:       image.id,
      type:     MediaType.PreviewImage,
      variants: []
    }
    pushVariant('source', media.variants, image, 'image/jpeg', VariantType.Image);

    if (image.variants) {
      if (image.variants.gif)
        pushVariant('gif', media.variants, image.variants.gif, 'image/gif', VariantType.GIF);
      if (image.variants.mp4)
        pushVariant('mp4', media.variants, image.variants.mp4, 'video/mp4', VariantType.Video);

    }

    collection.push(media);
  }
  return collection;
}

/** Downloads and parses the DASH manifest from the secure_media.reddit_video.dash_url. */
async function fetchDashMediaFromRedditVideo(fetch: Fetch, redditVideo: Video): Promise<Variant[]> {

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
function parseMediaFromDash(mpdContent: string, baseUrl: string): Variant[] {
  const flattenArrayable = <T>(arg: T | T[]): T => Array.isArray(arg) ? arg[0] : arg;
  const fattenArrayable = <T>(arg: T | T[]): T[] => Array.isArray(arg) ? arg : [ arg ];

  const media: Variant[] = [];
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
        type:      VariantType.PartialVideo,
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
        id:   representation['@_id'] ?? '',
        mime: 'audio/mp4',
        type: VariantType.PartialAudio,
        href: `${baseUrl}/${representation.BaseURL}`,
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