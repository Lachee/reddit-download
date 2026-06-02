import type { Readable } from "node:stream";
import { type ChildProcessByStdio, spawn } from "node:child_process";

export type ConvertOptions = {
  videoPath: string;
  fps?: number;
  scale?: number;
};

export type ConvertStreamResult = {
  stream: Readable;
  ffmpeg: ChildProcessByStdio<null, Readable, Readable>;
};

export function convertStream({
                                videoPath,
                                fps = 15,
                                scale = 480,
                              }: ConvertOptions): ConvertStreamResult {
  const filter = [
    `fps=${fps}`,
    `scale=${scale}:-1:flags=lanczos`,
    `split[s0][s1]`,
    `[s0]palettegen[p]`,
    `[s1][p]paletteuse`,
  ].join(",");

  const args = [
    "-hide_banner",
    "-y",
    "-i", videoPath,
    "-filter_complex", filter,
    "-loop", "0",
    "-f", "gif",
    "pipe:1",
  ];

  console.log("Running ffmpeg with args:", "ffmpeg", args.join(" "));

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