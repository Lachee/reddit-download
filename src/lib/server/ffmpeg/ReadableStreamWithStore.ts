import type { ChildProcess } from "node:child_process";
import type { Readable } from "node:stream";

export function createReadableStream(
  readable: Readable,
  readableProcess: ChildProcess,
  store: (data: Uint8Array<ArrayBuffer>) => void,
  reject: (err: any) => void,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>(
    new Controller(readable, readableProcess, store, reject),
  );
}

class Controller {
  private readonly chunks: Uint8Array[] = [];

  private controller?: ReadableStreamDefaultController<Uint8Array>;
  private settled = false;
  private readableEnded = false;
  private processClosed = false;

  constructor(
    private readonly readable: Readable,
    private readonly readableProcess: ChildProcess,
    private readonly store: (data: Uint8Array<ArrayBuffer>) => void,
    private readonly abort: (err: any) => void,
  ) {
  }

  start(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller;

    this.readable.on("data", this.onData);
    this.readable.once("end", this.onReadableEnd);
    this.readable.once("error", this.onReadableError);

    this.readableProcess.once("error", this.onProcessError);
    this.readableProcess.once("close", this.onProcessClose);
  }

  cancel() {
    if (this.settled) return;

    const err = new Error("Client cancelled stream");
    this.abort(err);

    this.settled = true;
    this.cleanup();

    console.log("Cancelling stream");
    if (!this.readableProcess.killed) {
      this.readableProcess.kill("SIGTERM");
    }

  }

  private readonly onData = (chunk: Buffer | Uint8Array) => {
    if (this.settled || !this.controller) return;

    const data = chunk instanceof Uint8Array
                 ? chunk
                 : new Uint8Array(chunk);

    this.chunks.push(data);

    try {
      this.controller.enqueue(data);
    } catch (err) {
      this.fail(err);
    }
  };

  private readonly onReadableEnd = () => {
    this.readableEnded = true;
    this.finish();
  };

  private readonly onReadableError = (err: unknown) => {
    console.log("Readable stream error", err);
    this.fail(err);
  };

  private readonly onProcessError = (err: unknown) => {
    console.log("Stream process error", err);
    this.fail(err);
  };

  private readonly onProcessClose = (code: number | null, signal: NodeJS.Signals | null) => {
    this.processClosed = true;

    console.log("Stream process closed", { code, signal });

    if (this.settled) return;

    if (code !== 0) {
      this.fail(new Error(`Stream process exited with code ${code}, signal ${signal}`));
      return;
    }

    this.finish();
  };

  private finish() {
    if (this.settled || !this.controller) return;

    // Wait for both stdout to end and the child process to close cleanly.
    if (!this.readableEnded || !this.processClosed) return;

    this.settled = true;
    this.cleanup();

    try {
      const bytes = Buffer.concat(this.chunks);
      this.store(bytes);
      this.controller.close();
    } catch (err) {
      this.abort(err);
    }
  }

  private fail(err: unknown) {
    if (this.settled) return;

    this.settled = true;
    this.cleanup();

    const error = err instanceof Error ? err : new Error(String(err));

    try {
      this.controller?.error(error);
    } catch {
      // Controller may already be closed/cancelled by the runtime.
    }

    this.abort(error);

    if (!this.readableProcess.killed) {
      this.readableProcess.kill("SIGTERM");
    }
  }

  private cleanup() {
    this.readable.off("data", this.onData);
    this.readable.off("end", this.onReadableEnd);
    this.readable.off("error", this.onReadableError);

    this.readableProcess.off("error", this.onProcessError);
    this.readableProcess.off("close", this.onProcessClose);
  }
}