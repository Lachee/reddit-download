import { z } from 'zod';
import { env } from "$env/dynamic/private";
import { type Mime, type Variant, VariantType } from "$lib/reddit/Media";

/** Imgur serves resized copies of an image by suffixing its id, where the size is the longest edge. */
const RESIZED_SUFFIXES = { l: 640, m: 320, t: 160 } as const;

const mediaSchema = z.looseObject({
  id:        z.string(),
  mime_type: z.string(),
  type:      z.string(),
  url:       z.string(),
  width:     z.number(),
  height:    z.number(),
});

const postSchema = z.looseObject({
  id:    z.string(),
  media: z.array(mediaSchema),
});

type ImgurMedia = z.infer<typeof mediaSchema>;

/** Gets the API endpoint that describes the imgur link, or undefined if it is not a link we understand. */
function getEndpoint(url: URL): string | undefined {
  if (!/(^|\.)imgur\.com$/i.test(url.hostname))
    return undefined;

  const [ kind, ...rest ] = url.pathname.split('/').filter(Boolean);
  if (!kind)
    return undefined;

  // Albums and galleries can have a slug before the id, such as /a/some-title-RUrRgBj
  const slugged = (segment?: string) => segment?.substring(segment.lastIndexOf('-') + 1);
  switch (kind) {
    case 'a':
      return rest[0] ? `albums/${slugged(rest[0])}` : undefined;
    case 'gallery':
      return rest[0] ? `posts/${slugged(rest[0])}` : undefined;
    case 't': // tagged galleries are /t/<tag>/<id>
      return rest[1] ? `posts/${slugged(rest[1])}` : undefined;
    default:
      // Direct links like i.imgur.com/8vK8Jvm.jpg or imgur.com/8vK8Jvm
      return rest.length === 0 ? `media/${kind.replace(/\.\w+$/, '')}` : undefined;
  }
}

function getVariants(media: ImgurMedia): Variant[] {
  const isVideo = media.type === 'video' || media.mime_type.startsWith('video/');
  const isGif = media.mime_type === 'image/gif';
  const variants: Variant[] = [ {
    id:        media.id,
    href:      media.url,
    mime:      media.mime_type as Mime,
    type:      isVideo ? VariantType.Video : isGif ? VariantType.GIF : VariantType.Image,
    dimension: { width: media.width, height: media.height }
  } ];

  // Imgur will give a jpeg for any media, which for videos is the poster frame.
  if (isVideo || isGif) {
    variants.push({
      id:        media.id,
      href:      `https://i.imgur.com/${media.id}.jpeg`,
      mime:      'image/jpeg',
      type:      VariantType.Image,
      dimension: { width: media.width, height: media.height }
    });
  }

  const longest = Math.max(media.width, media.height);
  for (const [ suffix, size ] of Object.entries(RESIZED_SUFFIXES)) {
    if (size >= longest)
      continue;

    const scale = size / longest;
    variants.push({
      id:        media.id,
      href:      `https://i.imgur.com/${media.id}${suffix}.jpeg`,
      mime:      'image/jpeg',
      type:      VariantType.Image,
      dimension: { width: Math.round(media.width * scale), height: Math.round(media.height * scale) }
    });
  }

  return variants;
}

export function isImgurUrl(url: URL): boolean {
  return getEndpoint(url) !== undefined;
}

/** Gets the variants of every file in the imgur link. Each file's variants share its id, so albums can be told apart. */
const imgur = async (fetch: typeof window.fetch, url: URL): Promise<Variant[]> => {
  if (!env.IMGUR_CLIENT_ID) {
    console.warn('[imgur] IMGUR_CLIENT_ID is not set, so imgur links cannot be resolved');
    return [];
  }

  const endpoint = getEndpoint(url);
  const response = await fetch(`https://api.imgur.com/post/v1/${endpoint}?client_id=${env.IMGUR_CLIENT_ID}&include=media`);
  if (!response.ok) {
    console.error('[imgur] failed to fetch', endpoint, response.status, await response.text());
    return [];
  }

  const validation = postSchema.safeParse(await response.json());
  if (!validation.success) {
    console.error('[imgur] Failed to parse Imgur response:', validation.error);
    return [];
  }

  return validation.data.media.flatMap(getVariants);
}

export default imgur;
