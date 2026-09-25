import type { Post } from "$lib/reddit/schema/postSchema";
import type { OGPProperty } from "$lib/components/OpenGraph.svelte";
import { findEmbeddedMedia, type Media, type MediaCollection, sort, type Variant, VariantType } from "$lib/reddit/Media";
import { page } from '$app/state';
import { normalizePermalink, normalizeMedialink } from "$lib/reddit/Utilities";
import { getDownloadLink } from "$lib/reddit/Download";


export function getOpenGraphProperties(post: Post, collection: MediaCollection, rawPermalink: string): OGPProperty[] {
  const permalink = normalizePermalink(rawPermalink);
  const medialink = normalizeMedialink(rawPermalink);
  const embedded = findEmbeddedMedia(collection);
  const properties: OGPProperty[] = [
    { name: 'og:site_name', content: post.url ?? post.title },
    { name: 'og:title', content: post.title },
    { name: 'og:url', content: new URL(`/${permalink}`, page.url.origin).toString() },
    { name: 'twitter:site', content: '@reddit' },
    { name: 'twitter:title', content: post.title },
  ];

  const video = embedded.find(m => isVideo(sort(m.variants)[0]));

  if (video) {
    // Video Post
    const videoLink = new URL(getDownloadLink(medialink, video), page.url.origin).toString();
    properties.push({ name: 'og:type', content: 'video.other' });
    properties.push({ name: 'twitter:player', content: videoLink });
    properties.push({ name: 'og:video', content: videoLink });
    properties.push({ name: 'og:video:url', content: videoLink });
    properties.push({ name: 'og:video:secure_url', content: videoLink });

    // Video Object
    const m = sort(video.variants)[0];
    properties.push({ name: 'og:video:type', content: 'video/mp4' });
    if (m.dimension) {
      properties.push({ name: 'og:video:width', content: m.dimension.width.toString() });
      properties.push({ name: 'twitter:player:width', content: m.dimension.width.toString() });
      if (m.dimension.height) {
        properties.push({ name: 'og:video:height', content: m.dimension.height.toString() });
        properties.push({ name: 'twitter:player:height', content: m.dimension.height.toString() });
      }
    }
  } else {
    // Gallery and Single Image posts
    properties.push({ name: 'og:type', content: 'website' });
    properties.push({ name: 'twitter:card', content: 'summary_large_image' });
    for (const media of embedded) {
      pushImage(properties, media, medialink);
    }
  }

  return properties;
}


function pushImage(properties: OGPProperty[], media: Media, mediaPath: string) {
  const m = sort(media.variants)[0];
  const isImage = m.type === VariantType.Image;
  const imageLink = new URL(getDownloadLink(mediaPath, media, !isImage), page.url.origin).toString();

  properties.push({ name: 'og:image', content: imageLink });
  properties.push({ name: 'og:image:type', content: isImage ? m.mime : 'image/gif' });
  if (m.dimension) {
    properties.push({ name: 'og:image:width', content: m.dimension.width.toString() });
    if (m.dimension.height)
      properties.push({ name: 'og:image:height', content: m.dimension.height.toString() });
  }

  properties.push({ name: 'twitter:image:src', content: imageLink });
}

function isVideo(variant: Variant): boolean {
  return variant.type === VariantType.Video || variant.type === VariantType.PartialVideo;
}
