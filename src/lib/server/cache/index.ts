import { Cache } from "./Cache";
import { createStore as createFileStore } from "./FileStore";
import { createStore as createMemoryStore } from './MemoryStore';
import { createStore as createNoneStore } from './NoneStore';
import { env } from "$env/dynamic/private"

let instance: Cache | undefined;

function createStore() {
  switch (env.CACHE_STORE) {
    case 'none':
      console.log('Using no cache');
      return createNoneStore();
    case 'memory':
      console.log('Using memory cache');
      return createMemoryStore();
    default:
    case 'file':
      console.log('Using file cache');
      return createFileStore({ directory: './.cache' });
  }
}

export const cache = () => {
  if (!instance) {
    instance = new Cache(createStore());
    setInterval(() => instance?.clean(), 1000 * 60 * 60);
  }

  return instance;
}