import postSchema, { type Post } from "$lib/reddit/schema/postSchema";
import commentSchema, { type Comment } from "$lib/reddit/schema/commentSchema";
import type { MediaMetadataItem } from "$lib/reddit/schema/mediaMetadataItemSchema";
import type { PreviewImage } from "$lib/reddit/schema/previewImageSchema";
import type { DevvitComment, DevvitGalleryMedia, DevvitPost, DevvitSecureMedia } from "./schema";

/*
 * Devvit gives a reduced view of a post compared to the .json endpoint.
 * These convert it back into the reddit JSON shape so the rest of the site works unchanged.
 *
 * What Devvit has: secure_media (reddit video DASH and oembed), the thumbnail, and `gallery`,
 * which is every gallery item, or for other posts one entry from the first preview image or GIF variant.
 * What Devvit drops: the preview resolutions and mp4/gif variants, reddit_video_preview, and media_metadata on comments.
 */

const REDDIT_HOST = /(^|\.)reddit\.com$/i;
const IMAGE_PATH = /\.(jpe?g|png|gif|webp)$/i;
const GALLERY_URL = /reddit\.com\/gallery\//i;
const COMMENT_IMAGE = /https?:\/\/(?:preview|i)\.redd\.it\/[a-z0-9_-]+\.(?:jpe?g|png|gif|webp)(?:\?[^\s)\]]*)?/gi;

type MediaKind = 'image' | 'gif' | 'mp4';

/** Reddit's non-raw JSON escapes html, which would break reading the oembed iframe and urls with query strings. */
function unescapeHtml(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

/** Empty strings become undefined, so optional url fields still pass the schema. */
function str(value: string | null | undefined): string | undefined {
  return value ? unescapeHtml(value) : undefined;
}

function num(value: number | null | undefined): number | undefined {
  return value ?? undefined;
}

function parseUrl(href: string): URL | undefined {
  try {
    return new URL(href);
  } catch {
    return undefined;
  }
}

/** Reddit media is named after its id, eg https://i.redd.it/abc123.jpg is abc123. */
function mediaId(href: string, fallback: string): string {
  const name = parseUrl(href)?.pathname.split('/').pop() ?? '';
  return name.replace(/\.[^.]+$/, '') || fallback;
}

/** preview.redd.it serves still renditions of gifs with a format, eg ?format=png8, and videos with ?format=mp4. */
function mediaKind(href: string): MediaKind {
  const url = parseUrl(href);
  const format = url?.searchParams.get('format');
  if (format === 'mp4' || url?.pathname.toLowerCase().endsWith('.mp4'))
    return 'mp4';
  if (!format && url?.pathname.toLowerCase().endsWith('.gif'))
    return 'gif';
  return 'image';
}

function mimeOf(href: string, kind: MediaKind): string {
  if (kind === 'mp4')
    return 'video/mp4';
  if (kind === 'gif')
    return 'image/gif';

  const ext = parseUrl(href)?.pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
}

function isFailed(status: DevvitGalleryMedia['status']): boolean {
  return status === 2 || (typeof status === 'string' && /failed/i.test(status));
}

function isRedditUrl(href: string): boolean {
  const url = parseUrl(href);
  return url !== undefined && REDDIT_HOST.test(url.hostname);
}

function toCreatedUtc(createdAt: string | number): number {
  const ms = typeof createdAt === 'number' ? createdAt : Date.parse(createdAt);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

function toSecureMedia(media: DevvitSecureMedia | null | undefined): Post['secure_media'] {
  if (!media)
    return undefined;

  const video = media.redditVideo;
  const oembed = media.oembed;
  return {
    type:         str(media.type),
    reddit_video: video ? {
      bitrate_kbps:       num(video.bitrateKbps),
      fallback_url:       str(video.fallbackUrl),
      height:             num(video.height),
      width:              num(video.width),
      scrubber_media_url: str(video.scrubberMediaUrl),
      dash_url:           str(video.dashUrl),
      hls_url:            str(video.hlsUrl),
      duration:           num(video.duration),
      is_gif:             video.isGif ?? undefined,
      transcoding_status: str(video.transcodingStatus),
    } : undefined,
    oembed:       oembed ? {
      type:             str(oembed.type),
      version:          str(oembed.version),
      title:            str(oembed.title),
      author_name:      str(oembed.authorName),
      author_url:       str(oembed.authorUrl),
      provider_name:    str(oembed.providerName),
      provider_url:     str(oembed.providerUrl),
      thumbnail_url:    str(oembed.thumbnailUrl),
      thumbnail_width:  num(oembed.thumbnailWidth),
      thumbnail_height: num(oembed.thumbnailHeight),
      html:             str(oembed.html),
      width:            num(oembed.width),
      height:           num(oembed.height),
    } : undefined,
  };
}

/** A gallery post's items become media_metadata, in the order Devvit gave them. */
function toGallery(gallery: DevvitGalleryMedia[]): Pick<Post, 'media_metadata' | 'gallery_data'> {
  const media_metadata: Record<string, MediaMetadataItem> = {};
  const items: NonNullable<Post['gallery_data']>['items'] = [];

  gallery.forEach((item, index) => {
    const url = unescapeHtml(item.url);
    let id = mediaId(url, `media_${index}`);
    if (id in media_metadata)
      id = `${id}_${index}`;

    const kind = mediaKind(url);
    const size = { x: item.width, y: item.height };
    media_metadata[id] = {
      status: isFailed(item.status) ? 'failed' : 'valid',
      e:      kind === 'image' ? 'Image' : 'AnimatedImage',
      m:      mimeOf(url, kind),
      s:      kind === 'image' ? { ...size, u: url } : kind === 'gif' ? { ...size, gif: url } : { ...size, mp4: url },
    };
    items.push({ media_id: id, id: index, is_deleted: false });
  });

  return { media_metadata, gallery_data: { items } };
}

/** Any other post's single gallery entry is its preview image (or GIF). */
function toPreview(item: DevvitGalleryMedia, thumbnail: DevvitPost['thumbnail']): Post['preview'] {
  if (isFailed(item.status))
    return undefined;

  const url = unescapeHtml(item.url);
  const kind = mediaKind(url);
  const media = { source: { url, width: item.width, height: item.height }, resolutions: [] };

  let image: PreviewImage;
  if (kind === 'image') {
    image = { id: mediaId(url, 'preview'), ...media, variants: {} };
  } else if (kind === 'gif') {
    image = { id: mediaId(url, 'preview'), ...media, variants: { gif: media } };
  } else if (thumbnail) {
    // A preview needs a still, which only the thumbnail can give for an mp4.
    const still = { url: unescapeHtml(thumbnail.url), width: thumbnail.width, height: thumbnail.height };
    image = { id: mediaId(url, 'preview'), source: still, resolutions: [], variants: { mp4: media } };
  } else {
    return undefined;
  }

  return { images: [ image ], enabled: true };
}

function toPostHint(post: DevvitPost, isGallery: boolean): string | undefined {
  if (post.secureMedia?.redditVideo)
    return 'hosted:video';
  if (post.secureMedia?.oembed)
    return 'rich:video';
  if (isGallery)
    return undefined;

  const url = parseUrl(post.url);
  if (url && IMAGE_PATH.test(url.pathname))
    return 'image';
  return isRedditUrl(post.url) ? 'self' : 'link';
}

/** Converts a Devvit post into the reddit JSON post. */
export function toPost(post: DevvitPost): Post {
  const id = post.id.replace(/^t3_/i, '');
  const url = unescapeHtml(post.url);
  const gallery = post.gallery ?? [];
  const isGallery = GALLERY_URL.test(url) || gallery.length > 1;
  const isSelf = isRedditUrl(url) && !isGallery;
  const subreddit = post.subredditName;

  return postSchema.parse({
    id,
    name:                    `t3_${id}`,
    kind:                    't3',
    title:                   post.title,
    author:                  post.authorName ?? null,
    subreddit,
    subreddit_name_prefixed: subreddit.startsWith('u_') ? `u/${subreddit.substring(2)}` : `r/${subreddit}`,
    permalink:               post.permalink.startsWith('/') ? post.permalink : `/${post.permalink}`,
    url,
    url_overridden_by_dest:  isRedditUrl(url) ? undefined : url,
    domain:                  parseUrl(url)?.hostname,
    selftext:                post.body ?? '',
    score:                   num(post.score),
    num_comments:            num(post.numberOfComments),
    created_utc:             toCreatedUtc(post.createdAt),
    over_18:                 post.nsfw ?? false,
    spoiler:                 post.spoiler ?? false,
    locked:                  post.locked ?? false,
    archived:                post.archived ?? false,
    stickied:                post.stickied ?? false,
    is_self:                 isSelf,
    is_video:                !!post.secureMedia?.redditVideo,
    is_gallery:              isGallery || undefined,
    thumbnail:               post.thumbnail ? unescapeHtml(post.thumbnail.url) : (isSelf ? 'self' : 'default'),
    thumbnail_width:         post.thumbnail?.width ?? null,
    thumbnail_height:        post.thumbnail?.height ?? null,
    post_hint:               toPostHint(post, isGallery),
    secure_media:            toSecureMedia(post.secureMedia),
    preview:                 !isGallery && gallery.length === 1 ? toPreview(gallery[0], post.thumbnail) : undefined,
    ...(isGallery ? toGallery(gallery) : {}),
    crosspost_parent:        post.crosspostParentId ?? undefined,
  });
}

/** Devvit comments have no media_metadata, so inline images are read from the links in the body instead. */
function toCommentMediaMetadata(body: string): Comment['media_metadata'] {
  const media_metadata: Record<string, MediaMetadataItem> = {};
  for (const [ match ] of body.matchAll(COMMENT_IMAGE)) {
    const url = unescapeHtml(match);
    const id = mediaId(url, `media_${Object.keys(media_metadata).length}`);
    if (id in media_metadata)
      continue;

    const kind = mediaKind(url);
    media_metadata[id] = {
      status: 'valid',
      e:      kind === 'image' ? 'Image' : 'AnimatedImage',
      m:      mimeOf(url, kind),
      s:      kind === 'gif' ? { gif: url } : { u: url },
    };
  }

  return Object.keys(media_metadata).length > 0 ? media_metadata : undefined;
}

/** Converts a Devvit comment into the reddit JSON comment. */
export function toComment(comment: DevvitComment): Comment {
  const id = comment.id.replace(/^t1_/i, '');
  const body = unescapeHtml(comment.body ?? '');

  return commentSchema.parse({
    id,
    name:           `t1_${id}`,
    author:         comment.authorName ?? null,
    body,
    permalink:      comment.permalink.startsWith('/') ? comment.permalink : `/${comment.permalink}`,
    score:          num(comment.score),
    media_metadata: toCommentMediaMetadata(body),
  });
}
