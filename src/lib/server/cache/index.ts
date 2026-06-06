import { Cache } from "./Cache";
import { createStore as createFileStore } from "./FileStore";
import { createStore as createMemoryStore } from './MemoryStore';
import { env } from "$env/dynamic/private"

let instance: Cache | undefined;

export const cache = () => {
  if (!instance) {
    const store = env.CACHE_STORE === 'memory'
                  ? createMemoryStore()
                  : createFileStore({ directory: './.cache' })

    instance = new Cache(store);
    setInterval(() => instance?.clean(), 1000 * 60 * 60);
  }

  return instance;
}