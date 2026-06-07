import type { Post } from "$lib/reddit/schema/postSchema";
import type { OGPProperty } from "$lib/components/OpenGraph.svelte";
import {
  getMediaCollection,
  type Variant,
  sort,
  VariantType,
  VariantOrder,
  type MediaCollection, MediaType, type Media
} from "$lib/reddit/server/Media";
import { page } from '$app/state';
import { normalizePermalink } from "$lib/reddit/Utilities";


export function getOpenGraphProperties(post: Post, collection : MediaCollection): OGPProperty[] {
  const permalink = normalizePermalink(post.permalink);
  const properties: OGPProperty[] = [
    { name: 'og:site_name', content: post.url ?? post.title},
    { name: 'og:title', content: post.title },
    { name: 'og:url', content: new URL(`/${permalink}`, page.url.origin).toString() },
    { name: 'twitter:site', content: '@reddit' },
    { name: 'twitter:title', content: post.title },
  ];

  const videoLink = new URL(`/v${permalink.substring(1)}`, page.url.origin).toString();

  if (collection.some(c => c.type === MediaType.SecureVideo || c.type === MediaType.PreviewVideo)) {
    // Video Post
    properties.push({ name: 'og:type', content: 'video.other' });
    properties.push({ name: 'twitter:player', content: videoLink });
    properties.push({ name: 'og:video', content: videoLink });
    properties.push({ name: 'og:video:url', content: videoLink });
    properties.push({ name: 'og:video:secure_url', content: videoLink });

    // Video Object
    const m = collection.find(c => c.type === MediaType.SecureVideo || c.type === MediaType.PreviewVideo)!.variants[0];
    properties.push({ name: 'og:video:type', content: 'video/mp4' });
    if (m.dimension) {
      properties.push({ name: 'og:video:width', content: m.dimension.width.toString() });
      properties.push({ name: 'twitter:player:width', content: m.dimension.width.toString() });
      if (m.dimension.height) {
        properties.push({ name: 'og:video:height', content: m.dimension.height.toString() });
        properties.push({ name: 'twitter:player:height', content: m.dimension.height.toString() });
      }
    }
  } else if (collection.some(c => c.type === MediaType.Gallery)) {
    // Gallery Post
    const gallery = collection.filter(c => c.type === MediaType.Gallery);
    for(const media of gallery) {
      pushImage(properties, media, permalink);
    }
  } else {
    // Single Image post
    const media = collection.find(c => c.type === MediaType.PreviewImage) || collection.find(c => c.type === MediaType.Thumbnail || c.type === MediaType.Overridden)!;
    pushImage(properties, media, permalink);
  }

  return properties;
}


function pushImage(properties: OGPProperty[], media : Media, permalink : string) {
  const gifLink = new URL(`/g${permalink.substring(1)}`, page.url.origin).toString();
  const imageLink = new URL(`/i${permalink.substring(1)}`, page.url.origin).toString();

  properties.push({ name: 'og:type', content: 'website' });
  properties.push({ name: 'og:image', content: gifLink });

  const m = media.variants[0];
  properties.push({ name: 'og:image:type', content: m.mime });
  if (m.dimension) {
    properties.push({ name: 'og:image:width', content: m.dimension.width.toString() });
    if (m.dimension.height)
      properties.push({ name: 'og:image:height', content: m.dimension.height.toString() });
  }

  properties.push({ name: 'twitter:card', content: 'summary_large_image' });
  properties.push({ name: 'twitter:image:src', content: m.type === VariantType.Image ? imageLink : gifLink });
}