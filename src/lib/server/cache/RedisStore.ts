import { type Store } from './Cache';
import { createClient } from 'redis'
import { pack, unpack } from 'msgpackr'

export type RedisStoreOpts = {
  url: string;
}

export default function createStore({
                                      url
                                    }: RedisStoreOpts): Store {
  let _lazyRedisClient: ReturnType<typeof createClient> | undefined;

  async function prepareClient() {
    if (_lazyRedisClient)
      return _lazyRedisClient;

    _lazyRedisClient = createClient({
      url:             url,
      RESP:            3,
      clientSideCache: {
        ttl:         0,                 // Time-to-live (0 = no expiration)
        maxEntries:  25,         // Maximum entries (0 = unlimited)
        evictPolicy: "FIFO"     // Eviction policy: "LRU" or "FIFO"
      }
    })

    _lazyRedisClient.on('disconnect', () => {
      console.log('Redis disconnected.')
      _lazyRedisClient = undefined;
    })

    await _lazyRedisClient.connect();
    return _lazyRedisClient;
  }

  console.log('[cache][redis] Preparing the redis cache at address ', url)
  prepareClient()
    .then(_ => console.log('[cache][redis] Redis connected successfully'))
    .catch(e => console.error('[cache][redis] Failed to connect to redis', e));

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const client = await prepareClient();
      const serialized = await client.get(key);
      if (serialized === null) {
        console.log('[redis-cache] cache-miss:', key);
        return undefined;
      }

      console.log('[redis-cache] cache-hit:', key);
      const raw = Buffer.from(serialized, 'base64');
      return unpack(raw) as T;
    },
    async set<T>(key: string, value: T, ttl: number): Promise<void> {
      console.log('[redis-cache] setting:', key);
      const client = await prepareClient();
      const raw = pack(value);
      const serialized = raw.toString('base64');
      await client.set(key, serialized, { EX: ttl });
    },
    async delete(key: string): Promise<void> {
      console.log('[redis-cache] deleting:', key);
      const client = await prepareClient();
      await client.del(key);
    },
    async clean(): Promise<void> {
      return Promise.resolve();
    }
  }
}