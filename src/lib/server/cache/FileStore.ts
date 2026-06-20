import { expired, type Store } from './Cache';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pack, unpack } from 'msgpackr'

const MAX_PAYLOAD_SIZE = 1024 * 1024 * 100; // 100 MB
const MAGIC = Buffer.from('CH67');
const HEADER_SIZE = 16;

type FileHeader = {
  expiresAt: number;
  payloadLength: number;
};

type FileStoreOptions = {
  directory: string;
}

export default function createStore({
                                      directory = './cache'
                                    }: FileStoreOptions): Store {

  const getFilePath = (key: string): string => {
    const hash = createHash('sha256').update(key).digest('hex');
    return path.join(directory, hash.slice(0, 2), `${hash}.bin`);
  };

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const path = getFilePath(key);
      let handle: fs.FileHandle | undefined;
      try {
        console.log('[cache][fs] trying to read cache from ', path);
        handle = await fs.open(path, 'r');

        // If the cache is expired, close the handle and remove the file.
        const header = await readHeader(handle);
        if (!header || expired(header.expiresAt)) {
          console.log('[cache][fs] cache-miss (expired) ', key);
          await handle.close();
          handle = undefined;
          await this.delete(key);
          return undefined;
        }

        // Extract the payload from the file.
        if (header.payloadLength <= 0 || header.payloadLength > MAX_PAYLOAD_SIZE) {
          console.error('[cache][fs] cache-read-error (header payload length exceeded max) ', key);
          await handle.close();
          handle = undefined;
          await this.delete(key);
          return undefined;
        }

        console.log('[cache][fs] cache-hit ', key);
        const payload = Buffer.alloc(header.payloadLength);
        const result = await handle.read(payload, 0, header.payloadLength, HEADER_SIZE);
        if (result.bytesRead !== header.payloadLength) {
          console.error('[cache][fs] cache-read-error (read bytes do not match header) ', key);
          await this.delete(key);
          return undefined;
        }

        return unpack(payload) as T;
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          console.log('[cache][fs] cache-read-error', key, error);
          fs.rm(path, { force: true }).catch(() => undefined);
        }

        console.log('[cache][fs] cache-miss', key);
        return undefined;
      } finally {
        await handle?.close().catch(() => undefined);
      }
    },
    async set<T>(key: string, value: T, ttl: number): Promise<void> {
      const filePath = getFilePath(key);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      console.log('[cache][fs] writting cache', key, filePath);
      const payload = pack(value);
      const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : 0;
      const header = writeHeader({ expiresAt, payloadLength: payload.length });

      // Atomically write the header and payload to a temporary file.
      // If the write fails, then the cache is not corrupted.
      const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      const handle = await fs.open(tempPath, 'wx');
      try {
        await handle.write(header, 0, header.byteLength, 0);
        await handle.write(payload, 0, payload.byteLength, HEADER_SIZE);
        await handle.sync();
      } finally {
        await handle.close();
      }

      await fs.rename(tempPath, filePath);
    },
    async delete(key: string): Promise<void> {
      console.log('[cache][fs] deleting ', key);
      const filePath = getFilePath(key);
      await fs.rm(filePath, { force: true }).catch(() => undefined);
    },
    clean(): Promise<void> {
      // TODO: Implement this.
      return Promise.resolve();
    }
  }
}

/** Reads the cache file's header */
async function readHeader(handle: Awaited<ReturnType<typeof fs.open>>): Promise<FileHeader | undefined> {
  const buffer = Buffer.allocUnsafe(HEADER_SIZE);
  const result = await handle.read(buffer, 0, HEADER_SIZE, 0);

  if (result.bytesRead !== HEADER_SIZE)
    return undefined;

  if (!buffer.subarray(0, 4).equals(MAGIC))
    return undefined;

  return {
    expiresAt:     Number(buffer.readBigUInt64BE(4)),
    payloadLength: buffer.readUInt32BE(12)
  };
}

/** Writes a new header */
function writeHeader(header: FileHeader): Buffer {
  const buffer = Buffer.allocUnsafe(HEADER_SIZE);
  MAGIC.copy(buffer, 0);
  buffer.writeBigUInt64BE(BigInt(Math.max(0, Math.floor(header.expiresAt))), 4);
  buffer.writeUInt32BE(header.payloadLength, 12);
  return buffer;
}