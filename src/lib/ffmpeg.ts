import { createFFmpeg, type FFmpeg } from '@ffmpeg/ffmpeg';

function log(...args: any[]) {
    console.log('[FFMPEG]', ...args);
}
function group(...args: any[]) {
    console.groupCollapsed('[FFMPEG]', ...args);
}
function groupEnd() {
    console.groupEnd();
}

/**
 * Combines the video and audio channel together.
 * @param video The base video
 * @param audio The audio channel to add
 * @returns The video data.
 */
export async function combine(video: string, audio?: string): Promise<Uint8Array> {

    // If this is a video only stream, lets just download it immediately.
    if (audio == null || audio == '')
        return await fetchFile(video);

    if (video == '')
        throw new Error('invalid video data');

    // It's a audio video, so we need to combine them with FFMPEG
    const ffmpeg = await getFFmpeg();

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

export async function convertToGif(video: string): Promise<Uint8Array> {
    if (video == '')
        throw new Error('invalid video data');

    log('converting to gif, fetching blob data for ', video);
    const ffmpeg = await getFFmpeg();

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
        _ffmpegInstance.setLogger(({ type, message }) => log(`[${type.toUpperCase()}]`, message));
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
/* Fetches the file. Similar to FFMPEG's but it actually throws exceptions. */
async function fetchFile(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Uint8Array> {
    log('downloading: ', input);
    const response = await fetch(input, init);
    if (response.status != 200)
        throw new Error(`HTTP Exception ${response.status}: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}


/** @deprecated not sure the purpose of this, surely a URL.createDataObject works fine? */
async function bufferToDataURL(buffer: Uint8Array): Promise<string> {
    // use a FileReader to generate a base64 data URI:
    const base64url = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(new Blob([buffer]))
    });
    // remove the `data:...;base64,` part from the start
    return base64url;//base64url.slice(base64url.indexOf(',') + 1);
}