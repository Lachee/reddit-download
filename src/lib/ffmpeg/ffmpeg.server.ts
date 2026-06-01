import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export type ProgressCallback = (progress: number) => void;

export type FfmpegBackend = {
  combine(video: string, audio?: string, onprogress?: ProgressCallback): Promise<Uint8Array>;
  convertToGif(video: string, onprogress?: ProgressCallback): Promise<Uint8Array>;
};

async function fetchFile(input: string, init?: RequestInit): Promise<Uint8Array> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`HTTP Exception ${response.status}: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function writeUrlToTempFile(url: string, filepath: string): Promise<void> {
  const data = await fetchFile(url);
  await writeFile(filepath, data);
}

function parseTimestamp(timestamp: string): number {
  const [hoursRaw, minutesRaw, secondsRaw] = timestamp.split(':');

  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const seconds = Number(secondsRaw);

  return hours * 3600 + minutes * 60 + seconds;
}

function parseFfmpegProgress(
  message: string,
  duration: number,
): { duration: number; progress?: number } {
  const trimmed = message.trim();

  const durationMatch = trimmed.match(/Duration:\s*(\d{2}:\d{2}:\d{2}\.\d{2})/);
  if (durationMatch) {
    return {
      duration: parseTimestamp(durationMatch[1]),
    };
  }

  const timeMatch = trimmed.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
  if (timeMatch && duration > 0) {
    const time = parseTimestamp(timeMatch[1]);

    return {
      duration,
      progress: Math.min(1, Math.max(0, time / duration)),
    };
  }

  return { duration };
}

function runFfmpeg(
  args: string[],
  onprogress?: ProgressCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';
    let duration = 0;
    let settled = false;

    onprogress?.(0);

    ffmpeg.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;

      for (const line of text.split(/\r?\n/)) {
        const parsed = parseFfmpegProgress(line, duration);
        duration = parsed.duration;

        if (parsed.progress != null) {
          onprogress?.(parsed.progress);
        }
      }
    });

    ffmpeg.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });

    ffmpeg.on('close', (code) => {
      if (settled) return;
      settled = true;

      if (code === 0) {
        onprogress?.(1);
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with ${code ?? 'unknown'}\n${stderr}`));
    });
  });
}

export const serverFfmpegBackend: FfmpegBackend = {
  async combine(
    video: string,
    audio?: string,
    onprogress?: ProgressCallback,
  ): Promise<Uint8Array> {
    if (!video) {
      throw new Error('invalid video data');
    }

    if (!audio) {
      return await fetchFile(video);
    }

    const dir = await mkdtemp(path.join(tmpdir(), 'reddit-media-'));

    try {
      const videoPath = path.join(dir, 'video.mp4');
      const audioPath = path.join(dir, 'audio.mp4');
      const outputPath = path.join(dir, 'output.mp4');

      await Promise.all([
        writeUrlToTempFile(video, videoPath),
        writeUrlToTempFile(audio, audioPath),
      ]);

      await runFfmpeg([
        '-y',
        '-i', videoPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        outputPath,
      ], onprogress);

      return new Uint8Array(await readFile(outputPath));
    } finally {
      await rm(dir, {
        recursive: true,
        force: true,
      });
    }
  },

  async convertToGif(
    video: string,
    onprogress?: ProgressCallback,
  ): Promise<Uint8Array> {
    if (!video) {
      throw new Error('invalid video data');
    }

    const dir = await mkdtemp(path.join(tmpdir(), 'reddit-media-'));

    try {
      const videoPath = path.join(dir, 'video.mp4');
      const outputPath = path.join(dir, 'output.gif');

      await writeUrlToTempFile(video, videoPath);

      const videoData = await readFile(videoPath);

      let fps: number | undefined;
      let scale: number | undefined;

      if (videoData.byteLength >= 4 * 1024 * 1024) {
        fps = 10;
        scale = 320;
      } else if (videoData.byteLength >= 1 * 1024 * 1024) {
        fps = 15;
        scale = 480;
      }

      const filters = [
        fps != null ? `fps=${fps}` : undefined,
        scale != null ? `scale=${scale}:-1:flags=lanczos` : undefined,
        'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
      ]
        .filter(Boolean)
        .join(',');

      await runFfmpeg([
        '-y',
        '-i', videoPath,
        '-vf', filters,
        '-loop', '0',
        outputPath,
      ], onprogress);

      return new Uint8Array(await readFile(outputPath));
    } finally {
      await rm(dir, {
        recursive: true,
        force: true,
      });
    }
  },
};

export const combine = serverFfmpegBackend.combine;
export const convertToGif = serverFfmpegBackend.convertToGif;