import type { Post } from "$lib/reddit/schema/postSchema";
import type { MediaMetadataItem } from "$lib/reddit/schema/mediaMetadataItemSchema";

type Fetch = typeof window.fetch;

export enum MediaType {
  SecureVideo  = 'secure_video',
  PreviewVideo = 'preview_video',
  PreviewImage = 'preview_image',
  Gallery      = 'gallery',
  Overridden   = 'overridden',
  Thumbnail    = 'thumbnail',
}

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

/**
 * Finds amongst the given variants, the one with the biggest area.
 * Missing dimensions are assumed to be 0px, favouring variants that actually report dimensions.
 */
export function findBiggestVariant(variant: Variant[]) : Variant | undefined {
  if (variant.length === 0)
    return undefined;

  return variant.reduce((a, b) => {
    const aArea = (a.dimension?.width ?? 0) * (a.dimension?.height ?? 0);
    const bArea = (b.dimension?.width ?? 0) * (b.dimension?.height ?? 0);
    return bArea - aArea > 0 ? b : a;
  });
}

/** @deprecated use the "findBestXXX" instead */
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