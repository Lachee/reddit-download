import type {Readable} from "node:stream";
import type {ChildProcessByStdio} from "node:child_process";

export function readStream(
    stream: Readable,
    ffmpeg: ChildProcessByStdio<null, Readable, Readable>,
) : Promise<Buffer<ArrayBuffer>> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let stderr = "";
        let settled = false;

        ffmpeg.stderr.on("data", chunk => {
            stderr += chunk.toString();
        });

        stream.on("data", chunk => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        stream.on("end", () => {
            if (settled) return;
            settled = true;

            resolve(Buffer.concat(chunks));
        });

        stream.on("error", error => {
            if (settled) return;
            settled = true;

            reject(error);
        });

        ffmpeg.on("error", error => {
            if (settled) return;
            settled = true;

            reject(error);
        });

        ffmpeg.on("close", code => {
            if (code === 0 || settled) return;

            settled = true;
            reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`));
        });
    });
}