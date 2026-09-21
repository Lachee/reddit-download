import type { Post } from "$lib/reddit/schema/postSchema";
import { findEmbeddedMedia, type Media, type MediaCollection } from "$lib/reddit/Media";
import { page } from '$app/state';
import { normalizeMedialink } from "$lib/reddit/Utilities";
import { getDownloadLink } from "$lib/reddit/Download";

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
  const items: MediaGalleryItem[] = findEmbeddedMedia(collection)
    .map(media => galleryItem(mediaUrl(media, medialink), post.title));

  // Split the items into multiples of 10 media galleries.
  const galleries : MediaGalleryComponent[] = [];
  for (let i = 0; i < items.length; i++) {
    const gindex = Math.floor(i / MAX_GALLERY_ITEMS);
    if (gindex >= galleries.length) 
      galleries[gindex] = { type: 12, items: [] };
    galleries[gindex].items.push(items[i]);
  }

  return {
    component: {
      type: 17,
      accent_color: ACCENT_COLOR,
      components: galleries,
    },
  };
}

function mediaUrl(media: Media, mediaPath: string): string {
  return new URL(getDownloadLink(mediaPath, media), page.url.origin).toString();
}

function galleryItem(url: string, description: string): MediaGalleryItem {
  return {
    media: { url },
    description: description.slice(0, MAX_DESCRIPTION),
  };
}