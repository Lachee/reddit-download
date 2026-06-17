import { expired, type Store } from './Cache';

type StoreEntry = {
  value: any;
  expiresAt: number;
}

export default function createStore(): Store {
  const map = new Map<string, StoreEntry>();
  return {
    get<T>(key: string): Promise<T | undefined> {
      const entry = map.get(key);
      if (entry === undefined || expired(entry.expiresAt)) {
        console.log('[cache][mem] cache-miss ', key);
        return Promise.resolve(undefined);
      }
      console.log('[cache][mem] cache-hit ', key);
      return Promise.resolve(entry.value);
    },
    set<T>(key: string, value: T, ttl: number): Promise<void> {
      console.log('[cache][mem] setting ', key, value);
      map.set(key, {
        value,
        expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : 0
      });
      return Promise.resolve();
    },
    delete(key: string): Promise<void> {
      console.log('[cache][mem] deleting ', key);
      map.delete(key);
      return Promise.resolve();
    },
    clean(): Promise<void> {
      const before = map.size;
      for (const [ key, entry ] of map) {
        if (entry.expiresAt < Date.now()) {
          map.delete(key);
        }
      }

      if (before != map.size)
        console.log('[cache][mem] cache-clean-done. Deleted: ', before - map.size)

      return Promise.resolve();
    }
  }
}