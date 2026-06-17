type Primitive = string | number | boolean | null | undefined | Uint8Array<ArrayBuffer>;

export interface Cacheable {
}

export interface Store {
  get<T extends Cacheable>(key: string): Promise<T | undefined>;

  set<T extends Cacheable>(key: string, value: T, ttl: number): Promise<void>;

  delete(key: string): Promise<void>;

  clean(): Promise<void>;
}


type CacheSemaphore<T extends Cacheable> = {
  promise: Promise<T>;
  expiresAt: number;
  completed: boolean;
};

type CacheKey = (string | { toString(): string })[];

export function expired(expiresAt: number): boolean {
  return expiresAt !== 0 && expiresAt < Date.now();
}


const keyName = (key: CacheKey): string => key.map(opt => encodeURIComponent(typeof opt === "string" ? opt : opt.toString())).join(":");

export class Cache {
  private semaphores = new Map<string, CacheSemaphore<any>>();
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  async wait(key: CacheKey): Promise<void> {
    const semaphore = this.semaphores.get(keyName(key));
    if (semaphore && !semaphore.completed) {
      console.log('[cache] waiting for semaphore', keyName(key));
      await semaphore.promise;
    }
  }

  async get<T extends Cacheable>(key: CacheKey): Promise<T | undefined> {
    let keyStr = keyName(key)

    // Ensure the value is currently not locked behind a semaphore.
    // If it is we dont want to read it, but rather wait for it to be completed.
    await this.wait(key);

    // We are completed, so lokoup the value if possible.
    console.log('[cache] fetching value', keyStr);
    const value = await this.store.get(keyStr);
    if (value === undefined) {
      await this.delete(key);
      return undefined;
    }

    return value as T;
  }

  async set<T extends Cacheable>(key: CacheKey, value: T, ttl: number = 0): Promise<void> {
    let keyStr = keyName(key)
    await this.store.set(keyStr, value, ttl);
  }

  async getSet<T extends Cacheable>(key: CacheKey, valueFn: () => T | Promise<T>, ttl: number = 0): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined)
      return cached;

    return await this.lock(key, async (store, abort) => {
      try {
        const value = await valueFn();
        store(value);
        return value;
      } catch (e) {
        abort(e);
        throw e;
      }
    }, ttl);
  }

  async delete(key: CacheKey): Promise<void> {
    let keyStr = keyName(key)
    await this.store.delete(keyStr);
  }

  async clean(): Promise<void> {
    // Clearup cache
    console.log('[cache] cleaning cache');
    await this.store.clean();

    // Clearup semaphores
    const scan = [...this.semaphores.keys()];
    for (const key of scan) {
      const semaphore = this.semaphores.get(key);
      if (semaphore && (expired(semaphore.expiresAt) || semaphore.completed)) {
        this.semaphores.delete(key);
      }
    }
  }

  async lock<TCacheData extends Cacheable, TReturn>(
    key: CacheKey,
    fn: (store: (value: TCacheData) => void, abort: (reason?: any) => void) => Promise<TReturn>,
    ttl: number = 0
  ): Promise<TReturn> {
    let semaphoreResolve!: (value: TCacheData) => void;
    let semaphoreReject!: (reason?: any) => void;
    const semaphore = new Promise<TCacheData>((resolve, reject) => {
      semaphoreResolve = resolve;
      semaphoreReject = reject;
    })

    // Hook into the semaphore event's to set the cache when completed.
    const keyStr = keyName(key)
    semaphore
      .then(value => {
        this.unlock(key, value);
        this.set(key, value, ttl)
        return value;
      })
      .catch(() => {
        this.unlock(key, undefined);
        this.delete(key);
      });

    // Store the pending semaphore and run the fn
    this.semaphores.set(keyStr, {
      promise:   semaphore,
      expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : 0,
      completed: false,
    });

    return await fn(semaphoreResolve, semaphoreReject)
      .catch(e => {
        semaphoreReject();
        this.semaphores.delete(keyStr);
        throw e;
      })
  }

  private unlock<TCacheData extends Cacheable>(key: CacheKey, value : TCacheData | undefined ): boolean {
    const keyStr = keyName(key)
    const semaphore = this.semaphores.get(keyStr);
    if (!semaphore)
      return false;

    // Unlock the semaphore before deleting. Any references waiting for it should be "completed"
    console.log('[cache] unlocking semaphore', keyStr);
    semaphore.completed = true;
    semaphore.promise = Promise.resolve(value)
    this.semaphores.delete(keyStr);
    return true;
  }
}

