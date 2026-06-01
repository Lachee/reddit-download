import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import type { Post } from "$lib/reddit/schema/postSchema";
import { getMedia, type Media, sort, Variant } from "$lib/reddit/server/Media";
import { authenticate } from "$lib/reddit/server/Authentication";
import { combine } from "$lib/ffmpeg/";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

export const GET: RequestHandler = async ({ url, params, fetch }) => {
  const post = await fetchPost(fetch, params.path);
  const media = await getMedia(post);
  sort(media);

  const { access_token } = await authenticate(fetch);
  const best = media[0];

  if (best.variant === Variant.PartialVideo) {
    const video = best;
    const audio = media.find(m => m.variant === Variant.PartialAudio);
    if (!audio)
      return error(404, 'No audio found for video');

    // FIX: Explicitly cast to the specific Uint8Array variant the global Response expects,
    // or pass the underlying raw buffer (data.buffer) directly.
    const data = await combine(video.href, audio.href);
    return new Response(data as Uint8Array<ArrayBuffer>, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': data.byteLength.toString(),
        'Content-Disposition': 'inline; filename="video.mp4"',
        'Accept-Ranges': 'bytes'
      }
    });
  }

  // const response = await fetch(best.href, {
  //   headers: {
  //     'Authorization': `Bearer ${access_token}`,
  //     'User-Agent':    USER_AGENT,
  //   }
  // });
  console.log('Fetching media from:', best.href);
  const response = await fetch(best.href, { headers: { 'origin': 'reddit.com', 'User-Agent': UserAgent } });
  if (!response.ok)
    return error(response.status, response.statusText);

  return response;
};