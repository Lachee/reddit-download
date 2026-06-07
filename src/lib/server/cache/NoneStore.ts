import { type Store } from './Cache';

export function createStore(): Store {
    return {
        get<T>(key: string): Promise<T | undefined> {
            return Promise.resolve(undefined);
        },
        set<T>(key: string, value: T, ttl: number): Promise<void> {
            return Promise.resolve();
        },
        delete(key: string): Promise<void> {
            return Promise.resolve();
        },
        clean(): Promise<void> {
            return Promise.resolve();
        }
    }
}