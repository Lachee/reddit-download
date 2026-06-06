type Primitive = string | number | boolean | null | Uint8Array<ArrayBuffer>;
export interface Cacheable {
  [k: string]: Primitive | Record<string, Primitive>
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


function keyName(key: CacheKey): string {
  return key.map(opt => typeof opt === "string" ? opt : opt.toString()).join(":");
}

export class Cache {
  private semaphores = new Map<string, CacheSemaphore<any>>();
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  async get<T extends Cacheable>(key: CacheKey): Promise<T | undefined> {
    let keyStr = keyName(key)

    // Ensure the value is currently not locked behind a semaphore.
    // If it is we dont want to read it, but rather wait for it to be completed.
    const semaphore = this.semaphores.get(keyStr);
    if (semaphore && !semaphore.completed)
      return semaphore.promise;

    // We are completed, so lokoup the value if possible.
    const value = await this.store.get(keyStr);
    if (value === undefined) {
      await this.delete(key);
      return undefined;
    }

    return value as T;
  }

  async set<T extends Cacheable>(key: CacheKey, value: T, ttl: number = 0): Promise<void> {
    let keyStr = keyName(key)
    this.semaphores.delete(keyStr);
    await this.store.set(keyStr, value, ttl);
  }

  async delete(key: CacheKey): Promise<void> {
    let keyStr = keyName(key)
    this.semaphores.delete(keyStr);
    await this.store.delete(keyStr);
  }

  async clean(): Promise<void> {
    await this.store.clean();
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
        this.set(key, value, ttl)
        return value;
      })
      .catch(() => {
        this.delete(key);
      });

    // Store the pending semaphore and run the fn
    this.semaphores.set(keyStr, {
      promise:   semaphore,
      expiresAt: ttl > 0 ? Date.now() + ttl : 0,
      completed: false,
    });

    return await fn(semaphoreResolve, semaphoreReject)
      .catch(e => {
        semaphoreReject();
        this.semaphores.delete(keyStr);
        throw e;
      })
  }
}

