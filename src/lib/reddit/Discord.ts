import type { Post } from "$lib/reddit/schema/postSchema";
import { type Media, type MediaCollection, MediaType, VariantType } from "$lib/reddit/Media";
import { page } from '$app/state';
import { normalizeMedialink } from "$lib/reddit/Utilities";

export type ComponentType = 12 | 17;

const MAX_GALLERY_ITEMS = 10;
const MAX_DESCRIPTION = 1024;
const ACCENT_COLOR = 0xff4500;

export interface UnfurledMediaItem {
  url: string;
}

export interface MediaGalleryItem {
  media: UnfurledMediaItem;
  /** Alt text. Max 1024 characters. */
  description?: string | null;
  spoiler?: boolean;
}

export interface MediaGalleryComponent {
  type: 12;
  /** 1–10 items. */
  items: MediaGalleryItem[];
}

export type ContainerChildComponent = MediaGalleryComponent;
export interface ContainerComponent {
  type: 17;
  components: ContainerChildComponent[];
  accent_color?: number | null;
  spoiler?: boolean;
}

/**
 * The JSON document served inline via
 * `<script id="discord:component-embed" type="application/json">` or linked
 * via `<link rel="discord:component-embed" type="application/json" href="...">`.
 *
 * Limits: 3000 raw response bytes, 40 components total across the tree.
 * `id` is not permitted anywhere in a component embed, hence its absence above.
 */
export interface ComponentEmbed {
  component: ContainerComponent;
}


export function getDiscordComponent(post: Post, collection: MediaCollection): ComponentEmbed {
  const medialink = normalizeMedialink(post.permalink);
  const items: MediaGalleryItem[] = [];

  const video = collection.find(c => c.type === MediaType.SecureVideo || c.type === MediaType.PreviewVideo);

  if (video) {
    items.push(galleryItem(new URL(`/v/${medialink}`, page.url.origin).toString(), post.title));
  } else {
    const gallery = collection.filter(c => c.type === MediaType.Gallery);
    const sources: Media[] = gallery.length > 0
      ? gallery
      : [collection.find(c => c.type === MediaType.PreviewImage)
        ?? collection.find(c => c.type === MediaType.Thumbnail || c.type === MediaType.Overridden)]
        .filter((m): m is Media => m !== undefined);

    for (const media of sources.slice(0, MAX_GALLERY_ITEMS)) {
      items.push(galleryItem(imageUrl(media, medialink), post.title));
    }
  }

  return {
    component: {
      type: 17,
      accent_color: ACCENT_COLOR,
      components: [{ type: 12, items }],
    },
  };
}

function imageUrl(media: Media, mediaPath: string): string {
  const variant = media.variants[0];
  const prefix = variant.type === VariantType.Image ? 'i' : 'g';
  return new URL(`/${prefix}/${mediaPath}`, page.url.origin).toString();
}

function galleryItem(url: string, description: string): MediaGalleryItem {
  return {
    media: { url },
    description: description.slice(0, MAX_DESCRIPTION),
  };
}