import type { OembedProvider } from "$lib/reddit/server/third-party/index";
import { type Variant, VariantType } from "$lib/reddit/Media";

const streamable: OembedProvider = async (fetch, oembed): Promise<Variant[]> => {
  const iframe = oembed.html;
  if (!iframe) {
    console.error(`[streamable] oembed "${oembed.title ?? ''}" has no iframe html to read the video from`)
    return [];
  }

  const streamableUrl = iframe.match(/src="([^"]+)"/)?.[1];
  if (!streamableUrl) {
    console.error('[streamable] oembed iframe has no src:', iframe)
    return [];
  }

  const videoId = streamableUrl.substring(streamableUrl.lastIndexOf('/') + 1);
  const response = await fetch(`https://api.streamable.com/videos/${videoId}`);
  if (!response.ok) {
    console.error(`[streamable] failed to fetch video ${videoId}: ${response.status} ${response.statusText}`)
    return [];
  }

  const data = await response.json();
  const mp4 = data.files?.mp4;
  if (!mp4) {
    console.error(`[streamable] video ${videoId} has no mp4 file, available: ${Object.keys(data.files ?? {}).join(', ') || 'none'}`)
    return [];
  }

  return [
    {
      id:        videoId,
      href:      mp4.url,
      mime:      'video/mp4',
      type:      VariantType.Video,
      dimension: {
        width:  mp4.width,
        height: mp4.height,
      }
    },
    {
      id:   videoId,
      href: data.thumbnail_url,
      mime: 'image/jpeg',
      type: VariantType.Image,
    }
  ];
}

export default streamable;