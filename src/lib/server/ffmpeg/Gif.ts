import type { Readable } from "node:stream";
import { type ChildProcessByStdio, spawn } from "node:child_process";
import {readStream, teeStream, type TeeResult} from "./Utilities.ts";

type ScalerFlags = 'fast_bilinear'
                    | 'bilinear'
                    | 'bicubic'
                    | 'experimental'
                    | 'neighbor'
                    | 'area'
                    | 'bicublin'
                    | 'gauss'
                    | 'sinc'
                    | 'lanczos'
                    | 'spline'
                    | 'print_info'
                    | 'accurate_rnd'
                    | 'full_chroma_int'
                    | 'full_chroma_inp'
                    | 'bitexact'
                    | 'unstable'

export type ConvertOptions = {
  videoPath: string;
  fps?: number;
  /** Longest edge of the gif in pixels. Smaller videos are never upscaled. */
  maxSize?: number;
  filtering?: ScalerFlags;
  maxColors?: number;
  dithering?: 'sierra2'|'bayer'|'floyd_steinberg'|`bayer:bayer_scale=${number}`
  threads?: number;
};

export type ConvertStreamResult = {
  stream: Readable;
  ffmpeg: ChildProcessByStdio<null, Readable, Readable>;
};

/**
 * Converts the video to a GIF and returns the result as a Buffer.
 */
export function convert(options: ConvertOptions): Promise<Buffer<ArrayBuffer>> {
  const { stream, ffmpeg } = convertStream(options);
  return readStream(stream, ffmpeg);
}

/** Converts the video to a GIF, streaming the frames as they are encoded while also collecting the whole GIF. */
export function convertTee(options: ConvertOptions): TeeResult {
  const { stream, ffmpeg } = convertStream(options);
  return teeStream(stream, ffmpeg);
}

/** Converts the video to a GIF and returns the result as a ReadableStream. */
export function convertStream({
                                videoPath,
                                fps = 15,
                                maxSize = 480,
    filtering = 'bicubic',
    maxColors = 256,
    dithering = 'floyd_steinberg',
    threads = 0,
                              }: ConvertOptions): ConvertStreamResult {
  const scale = `scale='min(${maxSize},iw)':'min(${maxSize},ih)':force_original_aspect_ratio=decrease:flags=${filtering}`;

  // The palette is built from a second decode of only the keyframes (input 1).
  // That finishes long before the full decode, so paletteuse can emit frames as they are decoded,
  // instead of the usual split/palettegen which has to see every frame before outputting the first.
  // diff_mode=rectangle only re-dithers the part of each frame that changed.
  const filter = [
    `[1:v]${scale},palettegen=max_colors=${maxColors}[p]`,
    `[0:v]fps=${fps},${scale}[v]`,
    `[v][p]paletteuse=dither=${dithering}:diff_mode=rectangle`,
  ].join(";");

  const args = [
    "-hide_banner",
    "-y",
    "-threads", `${threads}`,
    "-i", videoPath,
    "-skip_frame", "nokey",
    "-i", videoPath,
    "-filter_complex", filter,
    "-an", "-sn", "-dn",
    "-loop", "0",
    "-threads", `${threads}`,
    "-f", "gif",
    "pipe:1",
  ];

  const startAt = Date.now();
  const ffmpeg = spawn("ffmpeg", args, {
    stdio: [
      "ignore", // stdin
      "pipe",   // stdout
      "pipe",   // stderr
    ],
  }) as ChildProcessByStdio<null, Readable, Readable>;

  console.log(`[ffmpeg][gif] pid ${ffmpeg.pid} started on ${videoPath}`);

  let stderr = "";

  ffmpeg.stderr.on("data", chunk => {
    stderr += chunk.toString();
  });

  ffmpeg.on("error", error => {
    ffmpeg.stdout.destroy(error);
  });

  ffmpeg.on("close", code => {
    if (code !== 0) {
      console.error(`[ffmpeg][gif] pid ${ffmpeg.pid} exited with code ${code} after ${Date.now() - startAt}ms\n  ffmpeg ${args.join(' ')}\n${stderr}`);
      ffmpeg.stdout.destroy(
        new Error(`ffmpeg exited with code ${code}\n${stderr}`),
      );
    } else {
      console.log(`[ffmpeg][gif] pid ${ffmpeg.pid} converted ${videoPath} in ${Date.now() - startAt}ms`);
    }
  });

  return {
    stream: ffmpeg.stdout,
    ffmpeg,
  };
}