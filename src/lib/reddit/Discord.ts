import type { Post } from "$lib/reddit/schema/postSchema";
import { findEmbeddedMedia, type Media, type MediaCollection } from "$lib/reddit/Media";
import { page } from '$app/state';
import { normalizeMedialink } from "$lib/reddit/Utilities";
import { getDownloadLink } from "$lib/reddit/Download";

export type ComponentType = 2 | 9 | 10 | 12 | 17;

const MAX_GALLERY_ITEMS = 10;
const MAX_DESCRIPTION = 1024;
const MAX_TITLE = 20;
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

export interface ButtonEmoji {
  id?: string;
  name?: string;
  animated?: boolean;
}

export interface LinkButtonComponent {
  type: 2;
  style: 5;
  url: string;
  /** Max 80 characters. */
  label: string;
  emoji?: ButtonEmoji;
  disabled?: boolean;
}

export interface TextDisplayComponent {
  type: 10;
  content: string;
}

export interface SectionComponent {
  type: 9;
  /** 1–3 text displays. */
  components: TextDisplayComponent[];
  accessory: LinkButtonComponent;
}

export type ContainerChildComponent = MediaGalleryComponent | SectionComponent;
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

  const title = post.title.length > MAX_TITLE ? post.title.substring(0, MAX_TITLE - 3) + '...' : post.title;
  const header : SectionComponent = {
    type:  9,
    components: [
      {
        type: 10,
        content: title
      }
    ],
    accessory: {
      "type": 2,
      "style": 5,
      "label": "View on Reddit",
      "url": `https://reddit.com${post.permalink}`
    }
  }

  return {
    component: {
      type: 17,
      accent_color: ACCENT_COLOR,
      components: [
        header,
        ...galleries
      ],
    },
  };
}

function mediaUrl(media: Media, mediaPath: string): string {
  return new URL(getDownloadLink(mediaPath, media), page.url.origin).toString();
}

function galleryItem(url: string, description: string): MediaGalleryItem {
  return {
    media: { url },
  };
}