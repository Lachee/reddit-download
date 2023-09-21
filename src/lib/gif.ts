import { createFFmpeg, type FFmpeg } from "@ffmpeg/ffmpeg";
import { writable } from "svelte/store";

let _ffmpegInstance : FFmpeg;
export async function getFFmpeg() : Promise<FFmpeg> {
    if (_ffmpegInstance == null)
        _ffmpegInstance = createFFmpeg({
            log: true,
        });

    if (_ffmpegInstance.isLoaded()) 
        return _ffmpegInstance;
    
    console.log('loading ffmpeg');
    await _ffmpegInstance.load();
    return _ffmpegInstance;
}

export async function convertToGif(gif : Uint8Array) : Promise<Uint8Array> {
    
    const ffmpeg = await getFFmpeg();

    console.log('[2gif] combining...');
    await ffmpeg.FS('writeFile', 'video.mp4', gif);
    await ffmpeg.run(
        "-i", "video.mp4",
        "-vf", "fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        "-loop", "-1",
        "output.gif"
    );

    console.log('[2gif]', 'reading files...')
    const outputFile = await ffmpeg.FS('readFile', 'output.gif');
    console.log('[2gif] read the output file: ', outputFile);
    return outputFile;
}

export async function bufferToDataURL(buffer : Uint8Array) : Promise<string> {
    // use a FileReader to generate a base64 data URI:
    const base64url = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(new Blob([buffer]))
    });
    // remove the `data:...;base64,` part from the start
    return base64url;//base64url.slice(base64url.indexOf(',') + 1);
  }