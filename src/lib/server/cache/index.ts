import { Cache } from "./Cache";
import fileStore from "./FileStore";
import memoryStore from './MemoryStore';
import noopStore from './NoneStore';
import redisStore from './RedisStore';
import { env } from "$env/dynamic/private"

let instance: Cache | undefined;

function createStore() {
  switch (env.CACHE_STORE) {
    case 'none':
    case 'noop':
    case 'off':
    case 'false':
      console.log(`[cache] disabled (CACHE_STORE=${env.CACHE_STORE})`);
      return noopStore();

    case 'memory':
      console.log('[cache] using the in-memory store, the cache will not survive a restart');
      return memoryStore();

    case 'redis':
      console.log('[cache] using the redis store');
      return redisStore({ url: env.REDIS_URL ?? 'redis://localhost:6379' });

    default:
    case 'file':
      console.log(`[cache] using the file store in ${env.FILE_CACHE_DIR ?? './.cache'}${env.CACHE_STORE && env.CACHE_STORE !== 'file' ? ` (unknown CACHE_STORE "${env.CACHE_STORE}")` : ''}`);
      return fileStore({ directory: env.FILE_CACHE_DIR ?? './.cache' });
  }
}

export const cache = () => {
  if (!instance) {
    instance = new Cache(createStore());

    // Once an hour, tell the cache to clean itself up.
    setInterval(() => instance?.clean(), +(env.CACHE_GC_RATE ?? 3600) * 1000);
  }

  return instance;
}