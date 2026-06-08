import type { OembedProvider } from "$lib/reddit/server/third-party/index";
import { type Variant, VariantType } from "$lib/reddit/Media";

const streamable: OembedProvider = async (fetch, oembed): Promise<Variant[]> => {
  const iframe = oembed.html;
  if (!iframe) {
    console.error('Streamable oembed missing iframe')
    return [];
  }

  const streamableUrl = iframe.match(/src="([^"]+)"/)?.[1];
  if (!streamableUrl) {
    console.error('Streamable iframe is missing its src')
    return [];
  }

  const videoId = streamableUrl.substring(streamableUrl.lastIndexOf('/') + 1);
  const response = await fetch(`https://api.streamable.com/videos/${videoId}`);
  if (!response.ok) {
    console.error('Failed to fetch Streamable video data')
    return [];
  }

  const data = await response.json();
  const mp4 = data.files?.mp4;
  if (!mp4) {
    console.error('Streamable video data missing mp4 file')
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