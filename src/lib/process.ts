import type { Stream, Streams, VideoStream } from '$lib/reddit'
import { createFFmpeg, type FFmpeg } from "@ffmpeg/ffmpeg";

export async function downloadStream(streams: Streams, quality?: string): Promise<Uint8Array> {

    // If this is a video only stream, lets just download it immediately.
    if (streams.audio == null)
        return await downloadVideoFile(streams);
    
    // It's a audio video, so we need to combine them with FFMPEG
    const ffmpeg = createFFmpeg();
    await ffmpeg.load();
    try {
        console.log('[process]', 'downloading files...');
        await Promise.all([
            // @ts-ignore ignoring here because streams _is_ checked to ensure it's not null early.
            loadAudioFile(ffmpeg, streams),
            loadVideoFile(ffmpeg, streams)
        ]);

        console.log('[process]', 'combining files...');
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

        console.log('[process]', 'reading files...')
        return await ffmpeg.FS('readFile', 'output.mp4');
    }
    finally {
        console.log('[process]', 'Done');
        ffmpeg.exit();
    }
}

/** Loads the associated audio file. */
async function loadAudioFile(ffmpeg: FFmpeg, streams: Streams & { audio : Stream }): Promise<void> {
    const data = await fetchFile(streams.audio.url);
    await ffmpeg.FS('writeFile', 'audio.mp4', data);
}

/** Downloads and Loads the best video stream money can access (zero money to be precise) */
async function loadVideoFile(ffmpeg: FFmpeg, streams: Streams): Promise<void> {
    const data = await downloadVideoFile(streams);
    await ffmpeg.FS('writeFile', 'video.mp4', data);
}

async function downloadVideoFile(streams: Streams): Promise<Uint8Array> {
    const videos = Object.values(streams.video).sort((a, b) => (+b.format) - (+a.format));
    for (const video of videos) {
        try {
            return await fetchFile(video.url);
        } catch(e) {
            // @ts-ignore
            console.warn('[process]', 'Failed to download video.', e.message);
        }
    }
    throw new Error('Failed to download any video stream');
}

/* Fetches the file. Similar to FFMPEG's but it actually throws exceptions. */
async function fetchFile(input: RequestInfo | URL, init?: RequestInit | undefined) : Promise<Uint8Array> {
    console.log('[process]', 'downloading: ', input);
    const response = await fetch(input, init);
    if (response.status != 200)
        throw new Error(`HTTP Exception ${response.status}: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}