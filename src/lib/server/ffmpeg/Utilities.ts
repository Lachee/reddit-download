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

export type TeeResult = {
    /** The output as it is produced. Cancelling it does not stop ffmpeg, so `done` still completes. */
    body: ReadableStream<Uint8Array>,
    /** The entire output once ffmpeg has finished. */
    done: Promise<Buffer<ArrayBuffer>>,
}

/** Streams ffmpeg's output while also collecting it into a single Buffer, so it can be served and cached at the same time. */
export function teeStream(
    stream: Readable,
    ffmpeg: ChildProcessByStdio<null, Readable, Readable>,
) : TeeResult {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            stream.on("data", chunk => {
                if (!cancelled) controller.enqueue(new Uint8Array(chunk));
            });
            stream.on("end", () => {
                if (!cancelled) controller.close();
            });
            stream.on("error", error => {
                if (!cancelled) controller.error(error);
            });
        },
        cancel() {
            cancelled = true;
        },
    });

    return { body, done: readStream(stream, ffmpeg) };
}
