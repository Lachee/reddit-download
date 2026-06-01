export type ProgressCallback = (progress: number) => void;

export type FfmpegBackend = {
  combine(video: string, audio?: string, onprogress?: ProgressCallback): Promise<Uint8Array>;
  convertToGif(video: string, onprogress?: ProgressCallback): Promise<Uint8Array>;
};

export async function fetchFile(input: string, init?: RequestInit): Promise<Uint8Array> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`HTTP Exception ${response.status}: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export function parseTimestamp(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseFfmpegProgress(
  message: string,
  duration: number,
): { duration: number; progress?: number } {
  const trimmed = message.trim();
  const timestampRegex = /(\d{2}:\d{2}:\d{2}\.\d{2})/;
  const match = trimmed.match(timestampRegex);

  if (!match) {
    return { duration };
  }

  const time = parseTimestamp(match[1]);

  if (trimmed.startsWith('Duration:')) {
    return { duration: time };
  }

  if (duration > 0) {
    return {
      duration,
      progress: Math.min(1, Math.max(0, time / duration)),
    };
  }

  return { duration };
}