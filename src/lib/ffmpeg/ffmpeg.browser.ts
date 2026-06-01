import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { FfmpegBackend, ProgressCallback } from './ffmpeg.shared';
import {
  fetchFile,
  parseFfmpegProgress,
} from './ffmpeg.shared';

const log = console.log;
const group = console.group;
const groupEnd = console.groupEnd;

let ffmpegInstance: FFmpeg | undefined;
let ffmpegLoaded = false;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();

    ffmpegInstance.on('log', (params) => {
      console.log('[FFMPEG]', params.message);
    });
  }

  if (ffmpegLoaded) {
    return ffmpegInstance;
  }

  log('loading ffmpeg');
  await ffmpegInstance.load();
  ffmpegLoaded = true;

  return ffmpegInstance;
}

function addProgressCallback(ffmpeg: FFmpeg, onprogress: ProgressCallback) {
  let duration = 0;
  onprogress(0);

  ffmpeg.on('log', (params) => {
    const parsed = parseFfmpegProgress(params.message, duration);
    duration = parsed.duration;

    if (parsed.progress != null) {
      onprogress(parsed.progress);
    }
  });
}

async function loadFile(ffmpeg: FFmpeg, file: string, name: string): Promise<Uint8Array> {
  const data = await fetchFile(file);
  await ffmpeg.writeFile(name, data);
  return data;
}

export const browserFfmpegBackend: FfmpegBackend = {
  async combine(video: string, audio?: string, onprogress?: ProgressCallback): Promise<Uint8Array> {
    if (!audio) {
      return await fetchFile(video);
    }

    if (!video) {
      throw new Error('invalid video data');
    }

    const ffmpeg = await getFFmpeg();

    if (onprogress) {
      addProgressCallback(ffmpeg, onprogress);
    }

    await Promise.all([
      loadFile(ffmpeg, audio, 'audio.mp4'),
      loadFile(ffmpeg, video, 'video.mp4'),
    ]);

    group('combining...', { video, audio });

    await ffmpeg.exec([
      '-i', 'video.mp4',
      '-i', 'audio.mp4',
      '-c:v', 'copy',
      '-c:a', 'copy',
      'output.mp4',
    ]);

    groupEnd();

    const data = await ffmpeg.readFile('output.mp4');
    return data as Uint8Array;
  },

  async convertToGif(video: string, onprogress?: ProgressCallback): Promise<Uint8Array> {
    if (!video) {
      throw new Error('invalid video data');
    }

    const ffmpeg = await getFFmpeg();

    if (onprogress) {
      addProgressCallback(ffmpeg, onprogress);
    }

    const videoData = await loadFile(ffmpeg, video, 'video.mp4');

    let fps = -1;
    let scale = -1;

    if (videoData.byteLength >= 4 * 1024 * 1024) {
      fps = 10;
      scale = 320;
    } else if (videoData.byteLength >= 1 * 1024 * 1024) {
      fps = 15;
      scale = 480;
    }

    await ffmpeg.writeFile('video.mp4', videoData);

    await ffmpeg.exec([
      '-i', 'video.mp4',
      '-vf',
      `${fps >= 0 ? `fps=${fps},` : ''}` +
      `${scale >= 0 ? `scale=${scale}:-1:flags=lanczos,` : ''}` +
      'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
      '-loop', '0',
      'output.gif',
    ]);

    const data = await ffmpeg.readFile('output.gif');
    return data as Uint8Array;
  },
};