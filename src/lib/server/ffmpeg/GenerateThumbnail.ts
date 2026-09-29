import { type ChildProcessByStdio, spawn } from "node:child_process";
import type { Readable } from "node:stream";
import {readStream} from "./Utilities.ts";

type GenerateOption = {
  videoPath: string,
  seconds? : number,
  scale?: number,
}

type GenerateStreamResponse = {
  stream: Readable,
  ffmpeg: ChildProcessByStdio<null, Readable, Readable>,
}

/**
 * Combines the video and audio into a single MP4 Buffer.
 */
export function generateThumbnail(options: GenerateOption): Promise<Buffer<ArrayBuffer>> {
    const { stream, ffmpeg } = generateThumbnailStream(options);
    return readStream(stream, ffmpeg);
}

/** Generates a blurred square thumbnail labelled "+<more>". */
export function generateMoreThumbnail({ more, ...options }: GenerateOption & { more: number }): Promise<Buffer<ArrayBuffer>> {
    const { stream, ffmpeg } = generateThumbnailStream(options, `crop='min(iw,ih)':'min(iw,ih)',scale=512:512,gblur=sigma=24,eq=brightness=-0.3,drawtext=text='+${more}':font=sans:fontsize=120:fontcolor=white:shadowcolor=black@0.4:shadowy=2:x=(w-tw)/2:y=(h-th)/2`);
    return readStream(stream, ffmpeg);
}

/** Combines the video and audio into a single ReadableStream. */
export function generateThumbnailStream({ videoPath, seconds = 1, scale = -1 }: GenerateOption, filter = `scale=${scale}:-2`): GenerateStreamResponse {
  const args = [
    '-y',
    '-ss', `${seconds}`,
    '-i', videoPath,
    '-an',
    '-vframes', `1`,
    '-vf', filter,
    '-f', 'mjpeg',
    'pipe:1',
  ];


  const startAt = Date.now();
  const ffmpeg = spawn("ffmpeg", args, {
    stdio: [
      "ignore", // stdin
      "pipe",   // stdout
      "pipe",   // stderr
    ],
  });

  console.log(`[ffmpeg][thumbnail] pid ${ffmpeg.pid} started on ${videoPath}`);

  let stderr = "";

  ffmpeg.stderr.on("data", chunk => {
    stderr += chunk.toString();
  });

  ffmpeg.on("close", code => {
    if (code !== 0)
      console.error(`[ffmpeg][thumbnail] pid ${ffmpeg.pid} exited with code ${code} after ${Date.now() - startAt}ms\n  ffmpeg ${args.join(' ')}\n${stderr}`);
    else
      console.log(`[ffmpeg][thumbnail] pid ${ffmpeg.pid} finished in ${Date.now() - startAt}ms`);
  });

  ffmpeg.on("error", error => {
    ffmpeg.stdout.destroy(error);
  });

  return {
    stream: ffmpeg.stdout,
    ffmpeg,
  };
}
