import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import type { Post } from "$lib/reddit/schema/postSchema";
import { getMedia, type Media, sort, Variant } from "$lib/reddit/server/Media";
import { authenticate } from "$lib/reddit/server/Authentication";
import { type ConvertOptions, convertStream } from "$lib/server/ffmpeg/Gif";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

async function proxy(href: string): Promise<Response> {
  console.log('Fetching media from:', href);
  const response = await fetch(href, { headers: { 'origin': 'reddit.com', 'User-Agent': UserAgent } });
  if (!response.ok)
    return error(response.status, response.statusText);
  return response;
}

export const GET: RequestHandler = async ({ url, params, fetch }) => {
  const post = await fetchPost(fetch, params.path);
  const media = await getMedia(post);
  sort(media);

  // Find the best available gif and video
  // We will determine if we should convert the video to a gif by checking if the video is wider than the gif.
  const gif = media.find(m => m.variant === Variant.GIF);
  const video = media.find(m => m.variant === Variant.Video || m.variant === Variant.PartialVideo);
  const shouldConvert = video && (!gif || !gif.dimension || (video.dimension && video.dimension.width > gif.dimension.width));

  if (shouldConvert && video) {
    console.log('The best is a video, converting to a gif.');
    const scale = video.dimension?.height || video.dimension?.width || 480;
    const opts: ConvertOptions = {
      videoPath: video.href,
      fps:       scale > 360 ? 10 : 20,
      scale:     scale,
    };
    opts.fps = 10;

    const { stream, ffmpeg } = convertStream(opts);
    const startedAt = performance.now();

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on("data", chunk => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", err => {
          console.error(`ffmpeg stream error after ${(performance.now() - startedAt).toFixed(0)}ms:`, err);
          controller.error(err);
        });

        ffmpeg.on("close", code => {
          console.log(`ffmpeg exited with code ${code} after ${(performance.now() - startedAt).toFixed(0)}ms`);
        });
      },
      cancel() {
        console.log(`ffmpeg stream cancelled after ${(performance.now() - startedAt).toFixed(0)}ms`);
        ffmpeg.kill("SIGTERM");
      },
    });

    return new Response(body, {
      status:  200,
      headers: {
        "Content-Type":        "image/gif",
        "Content-Disposition": `inline; filename="animated.gif"`,
        "Cache-Control":       "no-store",
      },
    });
  }

  // Otherwise, use the best gif or whatever we have as a fallback
  const best = gif ?? media[0];
  console.log('Using existing media', best);
  return proxy(best.href);
};