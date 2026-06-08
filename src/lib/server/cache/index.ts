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
      console.log('[cache] Cache is disabled');
      return noopStore();

    case 'memory':
      console.log('[cache] Using memory cache');
      return memoryStore();

    case 'redis':
      console.log('[cache] Using redis cache');
      return redisStore({ url: env.REDIS_URL ?? 'redis://localhost:6379' });

    default:
    case 'file':
      console.log('[cache] Using file cache');
      return fileStore({ directory: env.FILE_CACHE_DIR ?? './.cache' });
  }
}

export const cache = () => {
  if (!instance) {
    instance = new Cache(createStore());

    // Once an hour, tell the cache to clean itself up.
    setInterval(() => instance?.clean(), 1000 * 60 * 60);
  }

  return instance;
}