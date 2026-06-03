import type { Post } from "$lib/reddit/schema/postSchema";
import type { OGPProperty } from "$lib/components/OpenGraph.svelte";
import { type Media, sort, Variant } from "$lib/reddit/server/Media";
import { page } from '$app/state';
import { normalizePermalink } from "$lib/reddit/Utilities";

const VariantOrder = [
  Variant.GIF,
  Variant.Video,
  Variant.PartialVideo,
  Variant.Image,
  Variant.Thumbnail,
  Variant.Blur,
  Variant.PartialAudio,
];

export function getOpenGraphProperties(post: Post, media: Media[]): OGPProperty[] {
  const permalink = normalizePermalink(post.permalink);
  const properties: OGPProperty[] = [
    { name: 'og:site_name', content: post.url + (media.length > 1 ? ` - gallery of ${media.length}` : '') },
    { name: 'og:title', content: post.title },
    { name: 'og:url', content: new URL(`/${permalink}`, page.url.origin).toString() },
    { name: 'twitter:site', content: '@reddit' },
    { name: 'twitter:title', content: post.title },
  ];

  const gifLink = new URL(`/g${permalink.substring(1)}`, page.url.origin).toString();
  const videoLink = new URL(`/v${permalink.substring(1)}`, page.url.origin).toString();
  for (const m of sort(media, VariantOrder)) {
    switch (m.variant) {
      case Variant.GIF:
        properties.push({ name: 'og:type', content: 'website' });
        properties.push({ name: 'og:image', content: gifLink });
        properties.push({ name: 'og:image:type', content: m.mime });
        if (m.dimension) {
          properties.push({ name: 'og:image:width', content: m.dimension.width.toString() });
          if (m.dimension.height)
            properties.push({ name: 'og:image:height', content: m.dimension.height.toString() });
        }

        properties.push({ name: 'twitter:card', content: 'summary_large_image' });
        properties.push({ name: 'twitter:image:src', content: gifLink });
        break;

      case Variant.Video:
      case Variant.PartialVideo:
        properties.push({ name: 'og:type', content: 'video.other' });
        properties.push({ name: 'twitter:player', content: videoLink });
        properties.push({ name: 'og:video', content: videoLink });
        properties.push({ name: 'og:video:url', content: videoLink });
        properties.push({ name: 'og:video:secure_url', content: videoLink });

        // Video Object
        properties.push({ name: 'og:video:type', content: m.mime });
        if (m.dimension) {
          properties.push({ name: 'og:video:width', content: m.dimension.width.toString() });
          properties.push({ name: 'twitter:player:width', content: m.dimension.width.toString() });
          if (m.dimension.height) {
            properties.push({ name: 'og:video:height', content: m.dimension.height.toString() });
            properties.push({ name: 'twitter:player:height', content: m.dimension.height.toString() });
          }
        }
    }
  }
  return properties;
}