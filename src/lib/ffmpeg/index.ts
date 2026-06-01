import { browser } from '$app/environment';
import type { FfmpegBackend, ProgressCallback } from './ffmpeg.shared';

let backendPromise: Promise<FfmpegBackend> | undefined;

async function getBackend(): Promise<FfmpegBackend> {
  if (backendPromise) {
    return backendPromise;
  }

  backendPromise = browser
                   ? import('./ffmpeg.browser').then((m) => m.browserFfmpegBackend)
                   : import('./ffmpeg.server').then((m) => m.serverFfmpegBackend);

  return backendPromise;
}

export async function combine(
  video: string,
  audio?: string,
  onprogress?: ProgressCallback,
): Promise<Uint8Array> {
  const backend = await getBackend();
  return backend.combine(video, audio, onprogress);
}

export async function convertToGif(
  video: string,
  onprogress?: ProgressCallback,
): Promise<Uint8Array> {
  const backend = await getBackend();
  return backend.convertToGif(video, onprogress);
}