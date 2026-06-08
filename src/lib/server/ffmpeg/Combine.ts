import { type ChildProcessByStdio, type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import type { Readable } from "node:stream";
import {readStream} from "./Utilities.ts";

export type CombineOptions = {
  videoPath: string,
  audioPath: string,
}

export type CombineStreamResult = {
  stream: Readable,
  ffmpeg: ChildProcessByStdio<null, Readable, Readable>,
}

/**
 * Combines the video and audio into a single MP4 Buffer.
 */
export function combine(options: CombineOptions): Promise<Buffer<ArrayBuffer>> {
    const { stream, ffmpeg } = combineStream(options);
    return readStream(stream, ffmpeg);
}

/** Combines the video and audio into a single ReadableStream. */
export function combineStream({ videoPath, audioPath }: CombineOptions): CombineStreamResult {
  const args = [
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c', 'copy',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
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
