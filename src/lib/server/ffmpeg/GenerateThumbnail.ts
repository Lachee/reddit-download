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

/** Combines the video and audio into a single ReadableStream. */
export function generateThumbnailStream({ videoPath, seconds = 1, scale = -1 }: GenerateOption): GenerateStreamResponse {
  const args = [
    '-y',
    '-ss', `${seconds}`,
    '-i', videoPath,
    '-an',
    '-vframes', `1`,
    '-vf', `scale=${scale}:-2`,
    '-f', 'mjpeg',
    'pipe:1',
  ];


  console.log('Running ffmpeg with args: ffmpeg ', args.join(' '));
  const ffmpeg = spawn("ffmpeg", args, {
    stdio: [
      "ignore", // stdin
      "pipe",   // stdout
      "pipe",   // stderr
    ],
  });

  let stderr = "";

  ffmpeg.stderr.on("data", chunk => {
    stderr += chunk.toString();
  });

  ffmpeg.on("close", code => {
    if (code !== 0) {
      console.error(`ffmpeg exited with code ${code}\n${stderr}`);
    }
  });

  ffmpeg.on("error", error => {
    ffmpeg.stdout.destroy(error);
  });

  return {
    stream: ffmpeg.stdout,
    ffmpeg,
  };
}
