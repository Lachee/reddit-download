import type { Stream, Streams, VideoStream } from '$lib/reddit'
import { createFFmpeg, type FFmpeg } from "@ffmpeg/ffmpeg";

export async function downloadStream(streams: Streams, quality?: string): Promise<Uint8Array> {
    const ffmpeg = createFFmpeg();
    await ffmpeg.load();

    try {
        // Download all the files
        console.log('[process]', 'downloading files...');
        await Promise.all([
            loadAudioFile(ffmpeg, streams),
            loadVideoFile(ffmpeg, streams)
        ]);

        // Combine the sources
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

        // Return result
        console.log('[process]', 'reading files...')
        const data = await ffmpeg.FS('readFile', 'output.mp4');

        console.log('[process]', 'Done');
        return data;
    }
    finally {
        ffmpeg.exit();
    }
}

/** Loads the associated audio file. */
async function loadAudioFile(ffmpeg: FFmpeg, streams: Streams): Promise<Stream> {
    console.log('[process]', 'downloading audio: ', streams.audio.url);
    const data = await fetchFile(streams.audio.url);
    await ffmpeg.FS('writeFile', 'audio.mp4', data);
    return streams.audio;
}

/** Downloads and Loads the best video stream money can access (zero money to be precise) */
async function loadVideoFile(ffmpeg: FFmpeg, streams: Streams): Promise<VideoStream> {
    const videos = Object.values(streams.video).sort((a, b) => (+b.format) - (+a.format));
    for (const video of videos) {
        try {
            console.log('[process]', 'downloading video: ', video.url);
            const data = await fetchFile(video.url);
            await ffmpeg.FS('writeFile', 'video.mp4', data);
            return video;
        } catch(e) {
            // @ts-ignore
            console.warn('[process]', 'Failed to download video.', e.message);
        }
    }
    throw new Error('Failed to download any video stream');
}

/* Fetches the file. Similar to FFMPEG's but it actually throws exceptions. */
async function fetchFile(input: RequestInfo | URL, init?: RequestInit | undefined) : Promise<Uint8Array> {
    const response = await fetch(input, init);
    if (response.status != 200)
        throw new Error(`HTTP Exception ${response.status}: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}