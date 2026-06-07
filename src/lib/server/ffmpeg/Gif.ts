import type { Readable } from "node:stream";
import { type ChildProcessByStdio, spawn } from "node:child_process";
import {readStream} from "./Utilities.ts";

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
  scale?: number;
  filtering?: ScalerFlags;
  maxColors?: number;
  dithering?: 'sierra2'|'bayer'|'floyd_stainberg'|`bayer:bayer_scale=${number}`
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

/** Converts the video to a GIF and returns the result as a ReadableStream. */
export function convertStream({
                                videoPath,
                                fps = 15,
                                scale = 480,
    filtering = 'lanczos',
    maxColors = 256,
    dithering = 'floyd_stainberg',
    threads = 0,
                              }: ConvertOptions): ConvertStreamResult {
  const filter = [
    `fps=${fps}`,
    `scale=${scale}:-1:flags=${filtering}`,
    `split[s0][s1]`,
    `[s0]palettegen=max_colors=${maxColors}[p]`,
    `[s1][p]paletteuse=dither=${dithering}`,
  ].join(",");

  const args = [
    "-hide_banner",
    "-y",
    "-i", videoPath,
    "-filter_complex", filter,
    "-loop", "0",
    "-threads", threads,
    "-f", "gif",
    "pipe:1",
  ];

  console.log("Running ffmpeg with args:", "ffmpeg", args.join(" "));

  const startAt = Date.now();
  const ffmpeg = spawn("ffmpeg", args, {
    stdio: [
      "ignore", // stdin
      "pipe",   // stdout
      "pipe",   // stderr
    ],
  }) as ChildProcessByStdio<null, Readable, Readable>;

  let stderr = "";

  ffmpeg.stderr.on("data", chunk => {
    stderr += chunk.toString();
  });

  ffmpeg.on("error", error => {
    ffmpeg.stdout.destroy(error);
  });

  ffmpeg.on("close", code => {
    const endAt = Date.now();
    console.log(`ffmpeg took ${endAt - startAt}ms to convert ${videoPath}`);
    if (code !== 0) {
      ffmpeg.stdout.destroy(
        new Error(`ffmpeg exited with code ${code}\n${stderr}`),
      );
    }
  });

  return {
    stream: ffmpeg.stdout,
    ffmpeg,
  };
}