import { type Store } from './Cache';
import { createClient, type RedisClientType } from 'redis'
import { pack, unpack } from 'msgpackr'

export type RedisStoreOpts = {
  url: string;
}

export default function createStore({
                                      url
                                    }: RedisStoreOpts): Store {
  let _lazyRedisClient: Promise<RedisClientType> | undefined;

  function prepareClient() {
    if (_lazyRedisClient)
      return _lazyRedisClient;

    const client = createClient({
      url:                 url,
      RESP:                3,
      disableOfflineQueue: true,
      socket:              {
        reconnectStrategy: retries => Math.min(1000 * Math.pow(2, retries), 5000)
      },
      clientSideCache:     {
        ttl:         0,                 // Time-to-live (0 = no expiration)
        maxEntries:  25,         // Maximum entries (0 = unlimited)
        evictPolicy: "FIFO"     // Eviction policy: "LRU" or "FIFO"
      }
    })

    client.on('error', e => console.error('[cache][redis] Redis error', e));

    client.on('end', () => {
      console.log('[cache][redis] Redis disconnected.')
      if (_lazyRedisClient === connecting)
        _lazyRedisClient = undefined;
    });

    const connecting = client.connect()
      .catch(e => {
        if (_lazyRedisClient === connecting)
          _lazyRedisClient = undefined;

        try {
          client.destroy();
        } catch { /* ignore destroy errors */ }
        throw e;
      });

    _lazyRedisClient = connecting;
    return connecting;
  }

  console.log('[cache][redis] Preparing the redis cache at address ', url)
  prepareClient()
    .then(_ => console.log('[cache][redis] Redis connected successfully'))
    .catch(e => console.error('[cache][redis] Failed to connect to redis', e));

  return {
    async get<T>(key: string): Promise<T | undefined> {
      try {
        const client = await prepareClient();
        const serialized = await client.get(key);
        if (serialized === null) {
          console.log('[cache][redis] cache-miss:', key);
          return undefined;
        }

        console.log('[cache][redis] cache-hit:', key);
        const raw = Buffer.from(serialized, 'base64');
        return unpack(raw) as T;
      } catch (e) {
        console.error('[cache][redis] failed to get:', key, e);
        return undefined;
      }
    },
    async set<T>(key: string, value: T, ttl: number): Promise<void> {
      console.log('[cache][redis] setting:', key);
      try {
        const client = await prepareClient();
        const raw = pack(value);
        const serialized = raw.toString('base64');
        await client.set(key, serialized, { EX: ttl });
      } catch (e) {
        console.error('[cache][redis] failed to set:', key, e);
      }
    },
    async delete(key: string): Promise<void> {
      console.log('[cache][redis] deleting:', key);
      try {
        const client = await prepareClient();
        await client.del(key);
      } catch (e) {
        console.error('[cache][redis] failed to delete:', key, e);
      }
    },
    async clean(): Promise<void> {
      return Promise.resolve();
    }
  }
}
