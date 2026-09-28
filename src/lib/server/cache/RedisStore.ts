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

  // The url can contain the password, so it is kept out of the logs.
  const safeUrl = url.replace(/\/\/[^@/]*@/, '//***@');

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

    client.on('error', e => console.error(`[cache][redis] client error on ${safeUrl}:`, e));

    client.on('end', () => {
      console.log(`[cache][redis] disconnected from ${safeUrl}, will reconnect on the next request`)
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

  console.log(`[cache][redis] connecting to ${safeUrl}`)
  prepareClient()
    .then(_ => console.log(`[cache][redis] connected to ${safeUrl}`))
    .catch(e => console.error(`[cache][redis] failed to connect to ${safeUrl}, requests will skip the cache until it does`, e));

  return {
    async get<T>(key: string): Promise<T | undefined> {
      try {
        const client = await prepareClient();
        const serialized = await client.get(key);
        if (serialized === null) {
          console.log(`[cache][redis] miss: ${key}`);
          return undefined;
        }

        console.log(`[cache][redis] hit: ${key} (${serialized.length} bytes encoded)`);
        const raw = Buffer.from(serialized, 'base64');
        return unpack(raw) as T;
      } catch (e) {
        console.error(`[cache][redis] failed to get ${key}, treating it as a miss`, e);
        return undefined;
      }
    },
    async set<T>(key: string, value: T, ttl: number): Promise<void> {
      try {
        const client = await prepareClient();
        const raw = pack(value);
        const serialized = raw.toString('base64');
        await client.set(key, serialized, { EX: ttl });
        console.log(`[cache][redis] set: ${key} (ttl ${ttl}s, ${raw.byteLength} bytes)`);
      } catch (e) {
        console.error(`[cache][redis] failed to set ${key}, it will not be cached`, e);
      }
    },
    async delete(key: string): Promise<void> {
      console.log(`[cache][redis] deleting: ${key}`);
      try {
        const client = await prepareClient();
        await client.del(key);
      } catch (e) {
        console.error(`[cache][redis] failed to delete ${key}, it may be served until it expires`, e);
      }
    },
    async clean(): Promise<void> {
      return Promise.resolve();
    }
  }
}
