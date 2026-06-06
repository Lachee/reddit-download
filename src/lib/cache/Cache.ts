type CacheEntry<T> = {
    value: T | undefined;
    promise: Promise<T>;
    expiresAt: number;
    completed: boolean;
};

type CacheKey = (string | { toString(): string })[];

function expired(entry: CacheEntry<any>): boolean {
    return entry.expiresAt !== 0 && entry.expiresAt < Date.now();
}

function keyName(key: CacheKey): string {
    return key.map(opt => typeof opt === "string" ? opt : opt.toString()).join(":");
}

export class Cache {
    private caches = new Map<string, CacheEntry<any>>();

    async get<T>(key: CacheKey): Promise<T | undefined> {
        let keystr = keyName(key)
        const cacheEntry = this.caches.get(keystr);
        if (!cacheEntry)
            return undefined;

        if (expired(cacheEntry)) {
            this.caches.delete(keystr);
            return undefined;
        }

        if (cacheEntry.completed) {
            return cacheEntry.value as T;
        }

        return cacheEntry.promise;
    }

    async set<T>(key: CacheKey, value: T, ttl: number = 0): Promise<void> {
        let keystr = keyName(key)
        const entry: CacheEntry<T> = {
            value,
            promise: Promise.resolve(value),
            expiresAt: ttl > 0 ? Date.now() + ttl : 0,
            completed: true,
        };
        this.caches.set(keystr, entry);
        return Promise.resolve();
    }

    clean() {
        this.caches.forEach((entry, key) => {
            try {
                if (expired(entry)) {
                    this.caches.delete(key);
                }
            } catch (e) {
                console.error('Error cleaning up cache', e);
            }
        });
    }

    async lock<TCacheData, TReturn>(
        key: CacheKey,
        cachePromise: (store: (value: TCacheData) => void, abort: (reason?: any) => void) => Promise<TReturn>,
        ttl: number = 0
    ): Promise<TReturn> {
        let semaphoreResolve!: (value: TCacheData) => void;
        let semaphoreReject!: (reason?: any) => void;
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
        const keystr = keyName(key)
        semaphore
            .then(value => {
                entry.value = value;
                entry.completed = true;
                return value;
            })
            .catch(() => {
                caches.delete(keystr);
            });
        this.caches.set(keystr, entry);

        // call the function, returning the resolve functions
        return await cachePromise(semaphoreResolve, semaphoreReject)
            .catch(e => {
                semaphoreReject();
                this.caches.delete(keystr);
                throw e;
            })
    }
}

