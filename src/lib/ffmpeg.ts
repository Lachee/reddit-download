import { createFFmpeg, type FFmpeg } from '@ffmpeg/ffmpeg';

import { browser } from '$app/environment';
import { proxy } from '$lib/helpers';

import logger from '$lib/log';
const { log, warn, group, groupEnd } = logger('FFMPEG');
const logProcess = (params: { type: string, message: string }) => log(`[${params.type.toUpperCase()}]`, params.message);

type ProgressCallback = (progress: number) => void;

/**
 * Combines the video and audio channel together.
 * @param video The base video
 * @param audio The audio channel to add
 * @returns The video data.
 */
export async function combine(video: string, audio?: string, onprogress?: ProgressCallback): Promise<Uint8Array> {

    // If this is a video only stream, lets just download it immediately.
    if (audio == null || audio == '')
        return await fetchFile(video);

    if (video == '')
        throw new Error('invalid video data');

    // It's a audio video, so we need to combine them with FFMPEG
    const ffmpeg = await getFFmpeg();

    // A little progress handler so we can report back how we are going with processing.
    if (onprogress)
        addProgressCallback(ffmpeg, onprogress);

    log('downloading files...');
    await Promise.all([
        loadFile(ffmpeg, audio, 'audio.mp4'),
        loadFile(ffmpeg, video, 'video.mp4')
    ]);

    group('combining...', { video, audio });
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
    groupEnd();

    log('reading files...')
    return await ffmpeg.FS('readFile', 'output.mp4');
}

export async function convertToGif(video: string, onprogress?: ProgressCallback): Promise<Uint8Array> {
    if (video == '')
        throw new Error('invalid video data');

    log('converting to gif, fetching blob data for ', video);
    const ffmpeg = await getFFmpeg();

    // A little progress handler so we can report back how we are going with processing.
    if (onprogress)
        addProgressCallback(ffmpeg, onprogress);

    // Load the video data
    const videoData = await loadFile(ffmpeg, video, 'video.mp4');

    // Determine the best settings
    let fps = -1;
    let scale = -1;

    if (videoData.byteLength >= 4 * 1024 * 1024) {
        log('large GIF detected, minimising to reduce filesize')
        fps = 10;
        scale = 320;
    }
    else if (videoData.byteLength >= 1 * 1024 * 1024) {
        log('medium GIF detected, minimising to reduce filesize')
        fps = 15;
        scale = 480;
    }

    // Finally combine
    //`fps={fps},scale=${size}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    await ffmpeg.FS('writeFile', 'video.mp4', videoData);

    group('converting...', { fps, scale, video });
    await ffmpeg.run(
        "-i", "video.mp4",
        "-vf",
        (fps >= 0 ? `fps=${fps},` : '') +
        (scale >= 0 ? `scale=${scale}:-1:flags=lanczos,` : '') +
        `split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        "-loop", "0",
        "output.gif"
    );
    groupEnd();

    log('reading files...')
    return await ffmpeg.FS('readFile', 'output.gif');
}

let _ffmpegInstance: FFmpeg;

/** Creates a FFMPEG instance. If one already exists, then it will reuse it. */
async function getFFmpeg(): Promise<FFmpeg> {
    if (_ffmpegInstance == null) {
        _ffmpegInstance = createFFmpeg();
        _ffmpegInstance.setLogger(logProcess);
    }

    if (_ffmpegInstance.isLoaded())
        return _ffmpegInstance;

    log('loading ffmpeg');
    await _ffmpegInstance.load();
    return _ffmpegInstance;
}

/** Downloads and Loads the best video stream money can access (zero money to be precise) */
async function loadFile(ffmpeg: FFmpeg, file: string, name: string): Promise<Uint8Array> {
    const data = await fetchFile(file);
    await ffmpeg.FS('writeFile', name, data);
    return data;
}
/* Downlaods a file and returns a Uint8Array.
 * If the request fails, it will attempt to proxy the request.
*/
async function fetchFile(input: string, init?: RequestInit | undefined): Promise<Uint8Array> {

    log('downloading: ', input);

    let response: Response;
    try {
        response = await fetch(input, init);
    } catch (error) {
        warn('failed to download the file', input, error);
        if (!browser) throw error;

        log('attempting to download a proxied version of the file');
        response = await fetch(proxy(input));
    }

    // Validate response
    if (response.status != 200)
        throw new Error(`HTTP Exception ${response.status}: ${response.statusText}`);

    // Return the content as a byte array.
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);

}
/** Added a progress listener to the current ffmpeg */
function addProgressCallback(ffmpeg: FFmpeg, onprogress: ProgressCallback) {
    let duration = 0;
    onprogress(0);

    ffmpeg.setLogger(params => {
        logProcess(params);

        // Pull out the timestamp
        const message = params.message.trim();
        const timestampRegex = /(\d{2}:\d{2}:\d{2}\.\d{2})/;
        const match = message.match(timestampRegex);
        if (match != null) {
            const time = parseTimestamp(match[1]);
            if (message.startsWith('Duration:')) {
                duration = time;
            } else if (duration > 0) {
                onprogress(time / duration);
            }
        }
    });
}

function parseTimestamp(timestamp: string): number {
    const [hours, minutes, seconds] = timestamp.split(':').map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds;
}