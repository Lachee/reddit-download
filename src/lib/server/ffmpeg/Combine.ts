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


  const startAt = Date.now();
  const ffmpeg = spawn("ffmpeg", args, {
    stdio: [
      "ignore", // stdin
      "pipe",   // stdout
      "pipe",   // stderr
    ],
  });

  console.log(`[ffmpeg][combine] pid ${ffmpeg.pid} started on ${videoPath}`);

  let stderr = "";

  ffmpeg.stderr.on("data", chunk => {
    stderr += chunk.toString();
  });

  ffmpeg.on("close", code => {
    if (code !== 0)
      console.error(`[ffmpeg][combine] pid ${ffmpeg.pid} exited with code ${code} after ${Date.now() - startAt}ms\n  ffmpeg ${args.join(' ')}\n${stderr}`);
    else
      console.log(`[ffmpeg][combine] pid ${ffmpeg.pid} finished in ${Date.now() - startAt}ms`);
  });

  ffmpeg.on("error", error => {
    ffmpeg.stdout.destroy(error);
  });

  return {
    stream: ffmpeg.stdout,
    ffmpeg,
  };
}
