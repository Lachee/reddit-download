import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { getFFmpeg } from './gif';

export type Stream = {
    video : string;
    audio? : string;
}

function log(...args: any[]) {
    console.log('[STREAM]', ...args);
}
function warn(...args: any[]) {
    console.warn('[STREAM]', ...args);
}

export async function downloadStream(stream : Stream): Promise<Uint8Array> {

    // If this is a video only stream, lets just download it immediately.
    if (!stream.audio)
        return await fetchFile(stream.video);
    
    // It's a audio video, so we need to combine them with FFMPEG
    const ffmpeg = await getFFmpeg();

    log('downloading files...');
    await Promise.all([
        loadAudioFile(ffmpeg, stream.audio),
        loadVideoFile(ffmpeg, stream.video)
    ]);

    log('combining files...');
    await ffmpeg.run(
        "-i",
        "video.mp4",
        "-i",
        "audio.mp4",
        "-c:v",
        "copy",
        "-c:a",
        "copy",
        "output.mp4"
    );

    log('reading files...')
    return await ffmpeg.FS('readFile', 'output.mp4');
}

/** Loads the associated audio file. */
async function loadAudioFile(ffmpeg: FFmpeg, file : string): Promise<void> {
    const data = await fetchFile(file);
    await ffmpeg.FS('writeFile', 'audio.mp4', data);
}

/** Downloads and Loads the best video stream money can access (zero money to be precise) */
async function loadVideoFile(ffmpeg: FFmpeg, file : string): Promise<void> {
    const data = await fetchFile(file);
    await ffmpeg.FS('writeFile', 'video.mp4', data);
}


/* Fetches the file. Similar to FFMPEG's but it actually throws exceptions. */
async function fetchFile(input: RequestInfo | URL, init?: RequestInit | undefined) : Promise<Uint8Array> {
    log('downloading: ', input);
    const response = await fetch(input, init);
    if (response.status != 200)
        throw new Error(`HTTP Exception ${response.status}: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}