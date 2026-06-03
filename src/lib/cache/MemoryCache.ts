type CacheEntry<T> = {
  value: T | undefined;
  promise: Promise<T>;
  expiresAt: number;
  completed: boolean;
};

const caches = new Map<string, CacheEntry<any>>();

export function keyName(...opts: (string | { toString(): string })[]): string {
  return opts.map(opt => typeof opt === "string" ? opt : opt.toString()).join(":");
}

function isExpired(entry: CacheEntry<any>): boolean {
  return entry.expiresAt !== 0 && entry.expiresAt < Date.now();
}

export async function cacheSemaphore<TCacheData, TReturn>(key : string, cachePromise: (store: (value: TCacheData) => void, abort: (reason?: any) => void) => Promise<TReturn>, ttl : number = 0): Promise<TReturn> {
  let semaphoreResolve! : (value: TCacheData) => void;
  let semaphoreReject! : (reason?: any) => void;
  const semaphore = new Promise<TCacheData>((resolve, reject) => {
    semaphoreResolve = resolve;
    semaphoreReject = reject;
  })

  const entry: CacheEntry<TCacheData> = {
    value: undefined,
    promise: semaphore,
    expiresAt: ttl > 0 ? Date.now() + ttl : 0,
    completed: false,
  }

  // Mark it as completed if the semaphore resolves
  semaphore
    .then(value => {
      console.log('Semaphore resolved');
      entry.value = value;
      entry.completed = true;
      return value;
    })
    .catch(() => {
      console.log('Semaphore rejected');
      caches.delete(key);
    });
  caches.set(key, entry);

  // call the function, returning the resolve functions
  return await cachePromise(semaphoreResolve, semaphoreReject);
}


export async function getCache<T>(key: string): Promise<T | undefined> {
  const cacheEntry = caches.get(key);
  if (!cacheEntry) return undefined;

  if (isExpired(cacheEntry)) {
    caches.delete(key);
    return undefined;
  }

  if (cacheEntry.completed) {
    return cacheEntry.value as T;
  }

  return cacheEntry.promise;
}

export function setCache<T>(key: string, value: T, ttl: number = 0): Promise<void> {
  const entry: CacheEntry<T> = {
    value,
    promise: Promise.resolve(value),
    expiresAt: ttl > 0 ? Date.now() + ttl : 0,
    completed: true,
  };

  caches.set(key, entry);
  return Promise.resolve();
}

export function setPendingCache<T>(
  key: string,
  promise: Promise<T>,
  ttl: number = 0,
): Promise<void> {
  const entry: CacheEntry<T> = {
    promise,
    value: undefined,
    expiresAt: ttl > 0 ? Date.now() + ttl : 0,
    completed: false,
  };

  entry.promise
    .then(value => {
      entry.value = value;
      entry.completed = true;
      return value;
    })
    .catch(() => {
      caches.delete(key);
    });

  caches.set(key, entry);
  return Promise.resolve();
}