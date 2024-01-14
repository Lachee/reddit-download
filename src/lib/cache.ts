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
        if (this.items[key] == undefined)
            return Promise.resolve(null);
        
        const item = this.items[key];
        if (item.expireAt && item.expireAt <= Date.now()) {
            this.delete(key);
            return Promise.resolve(null);
        }

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
        if (expireAt && expireAt > 0)
            setTimeout(() => this.delete(key), (expireAt - Date.now()) + 100);

        return Promise.resolve();
    }
}

let cache: Cache = new MemoryCache();
export const setCache = (c: Cache) => cache = c;
export const getCache = (): Cache => cache;