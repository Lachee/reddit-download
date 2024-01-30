export interface CachePutOptions {
    expiration?: number;
    expirationTtl?: number;
}

export interface Cache {
    get(key: string): Promise<string | null>;
    delete(key: string): Promise<void>;
    put(key: string, value: string, options?: CachePutOptions): Promise<void>;
}


type MemoryCacheItem = {
    key : string,
    value : string,
    expireAt? : number
};

/** a really simple in memory cache with a slow memory leak */
export class MemoryCache implements Cache {

    items : Record<string, MemoryCacheItem> = {};
    
    get(key: string): Promise<string | null> {
        if (this.items[key] == undefined) {
            console.log('[CACHE] MISS', `'${key}'`);
            return Promise.resolve(null);
        }
        

        const item = this.items[key];
        if (item.expireAt && item.expireAt <= Date.now()) {
            console.log('[CACHE] EXPR', `'${key}'`);
            this.delete(key);
            return Promise.resolve(null);
        }

        console.log('[CACHE] HIT', `'${key}'`);
        return Promise.resolve(item.value);
    } 

    delete(key: string): Promise<void> {
        delete this.items[key];
        return Promise.resolve();
    } 

    put(key: string, value: string, options?: CachePutOptions): Promise<void> {
        // Calculate expirey
        let expireAt : number|undefined;
        if (options) {
            if (options.expiration) {
                expireAt = options.expiration*1000;
            } else if (options.expirationTtl) {
                expireAt = Date.now() + (options.expirationTtl*1000);
            }
        }
        
        // Store item
        this.items[key] = { key, value, expireAt };

        // Timeout
        if (expireAt && expireAt > 0 && expireAt < Number.MAX_SAFE_INTEGER) {
            const duration = (expireAt - Date.now());
            if (duration <= 0x7FFFFFFF)  // NODE: This is a shitty node fix because durations might not fit in the timeout
                setTimeout(() => this.delete(key), duration);
        }
        

        console.log('[CACHE] STORE', `'${key}'`);
        return Promise.resolve();
    }
}

export const DummyCache : Cache = {
    get: (key: string): Promise<string | null> => Promise.resolve(null),
    delete: (key: string): Promise<void> => Promise.resolve(),
    put: (key: string, value: string, options?: CachePutOptions): Promise<void> => Promise.resolve()
}

let cache: Cache = new MemoryCache();
export const setCache = (c: Cache) => cache = c;
export const getCache = (): Cache => cache;

export const normalize = (key : string) => key.toLowerCase().replaceAll(' ', '');