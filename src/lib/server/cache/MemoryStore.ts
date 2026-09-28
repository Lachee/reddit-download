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
        console.log(`[cache][mem] miss${entry ? ' (expired)' : ''}: ${key}`);
        return Promise.resolve(undefined);
      }
      console.log(`[cache][mem] hit: ${key}`);
      return Promise.resolve(entry.value);
    },
    set<T>(key: string, value: T, ttl: number): Promise<void> {
      console.log(`[cache][mem] set: ${key} (ttl ${ttl > 0 ? `${ttl}s` : 'forever'}, ${map.size + (map.has(key) ? 0 : 1)} entries)`);
      map.set(key, {
        value,
        expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : 0
      });
      return Promise.resolve();
    },
    delete(key: string): Promise<void> {
      if (map.delete(key))
        console.log(`[cache][mem] deleted: ${key}`);
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
        console.log(`[cache][mem] cleaned ${before - map.size} expired entries, ${map.size} remain`)

      return Promise.resolve();
    }
  }
}