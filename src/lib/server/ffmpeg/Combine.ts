import { type ChildProcessByStdio, type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import type { Readable } from "node:stream";

export type CombineOptions = {
  videoPath: string,
  audioPath: string,
}


/**
 * Combines the video and audio into a single MP4 Buffer.
 *
 * This uses combineStream internally, then buffers the whole output in memory.
 * For large videos, prefer combineStream directly.
 */
export function combine(options: CombineOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { stream, ffmpeg } = combineStream(options);

    const chunks: Buffer[] = [];
    let stderr = "";
    let settled = false;

    ffmpeg.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    stream.on("data", chunk => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on("end", () => {
      if (settled) return;
      settled = true;

      resolve(Buffer.concat(chunks));
    });

    stream.on("error", error => {
      if (settled) return;
      settled = true;

      reject(error);
    });

    ffmpeg.on("error", error => {
      if (settled) return;
      settled = true;

      reject(error);
    });

    ffmpeg.on("close", code => {
      if (code === 0 || settled) return;

      settled = true;
      reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`));
    });
  });
}

export type CombineStreamResult = {
  stream: Readable,
  ffmpeg: ChildProcessByStdio<null, Readable, Readable>,
}

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

/*
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
    const process = spawn('ffmpeg', args, {
      stdio: [
        'ignore', //stdin
        'pipe',   //stdout
        'pipe',   //stderr
      ],
    });

    const streamedData: Buffer[] = [];
    let stderr = "";
    let completed = false;

    process.stdout.on("data", chunk => {
      streamedData.push(Buffer.from(chunk));
    });

    process.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    process.on("error", error => {
      if (completed) return;
      completed = true;
      reject(error);
    });

    process.on("close", code => {
      if (completed) return;
      completed = true;

      console.log("ffmpeg exited with code", code);

      if (code === 0) {
        resolve(Buffer.concat(streamedData));
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`));
    });
 */