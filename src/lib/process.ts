import type { Streams } from '$lib/reddit'
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

export async function downloadStream(streams : Streams, quality? : string) : Promise<Uint8Array> {
    const ffmpeg = createFFmpeg();
    await ffmpeg.load();

    try 
    {
        const audio = streams.audio;
        const video = quality != undefined 
            ? streams.video[quality] 
            : Object.values(streams.video).filter(v => v.maxFormat)[0];
        
            // Download all the files
            console.log('[FFMPEG] downloading files...');
            await Promise.all([
                fetchFile(audio.url).then((f) =>
                  ffmpeg.FS("writeFile", "audio.mp4", f)
                ),
                fetchFile(video.url).then((f) =>
                  ffmpeg.FS("writeFile", "video.mp4", f)
                ),
            ]);

            // Combine the sources
            console.log('[FFMPEG] combining files...');
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
            console.log('[FFMPEG] reading files...')
            const data = await ffmpeg.FS('readFile', 'output.mp4');

            console.log('Done');
            return data;
    }
    finally 
    {
        ffmpeg.exit();
    }
}