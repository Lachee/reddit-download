import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPost } from "$lib/reddit/server/Post";
import type { Post } from "$lib/reddit/schema/postSchema";
import { getMedia, type Media, sort, Variant } from "$lib/reddit/server/Media";
import { authenticate } from "$lib/reddit/server/Authentication";
import { combineStream } from "$lib/server/ffmpeg/Combine";
import { Readable } from "node:stream";

const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

export const GET: RequestHandler = async ({ url, params, fetch }) => {
  const post = await fetchPost(fetch, `r/${params.path}`);
  const media = await getMedia(post);
  sort(media);

  const { access_token } = await authenticate(fetch);
  const best = media[0];

  if (best.variant === Variant.PartialVideo) {
    const video = best;
    const audio = media.find(m => m.variant === Variant.PartialAudio);
    if (!audio)
      return error(404, 'No audio found for video');

    const { stream, ffmpeg } = combineStream({
      videoPath: video.href,
      audioPath: audio.href,
    });

    // Convert the stream into a body for the response.
    // We have to wrap this in a ReadableStream instead of just toWeb to make sure
    // the ffmpeg process is properly destroyed if the client disconnects.
    const startedAt = performance.now();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        if (stream && !stream.destroyed) {
          stream.on("data", chunk => {
            try {
              controller.enqueue(chunk);
            } catch (e) {
            }
          });

          stream.on("end", () => {
            try {
              controller.close();
            } catch (e) {
            }
          });

          stream.on("error", err => {
            const durationMs = performance.now() - startedAt;
            console.log(`combine stream finished in ${durationMs.toFixed(0)}ms`);

            try {
              controller.error(err);
            } catch (e) {
            }
          });
        }

        if (ffmpeg && !ffmpeg.killed) {
          ffmpeg.on("close", code => {
            const durationMs = performance.now() - startedAt;
            console.log(`ffmpeg exited with code ${code} after ${durationMs.toFixed(0)}ms`);
          });
        }
      },

      cancel() {
        const durationMs = performance.now() - startedAt;
        console.log(`combine stream cancelled after ${durationMs.toFixed(0)}ms`);

        ffmpeg.kill("SIGTERM");
      },
    });

    return new Response(body, {
      status:  200,
      headers: {
        "Content-Type":        "video/mp4",
        "Content-Disposition": `inline; filename="video.mp4"`,

        // Do not set Content-Length because ffmpeg is generating the file live.
        "Cache-Control": "no-store",
      },
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