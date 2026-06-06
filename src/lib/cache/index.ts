import { Cache } from "./Cache";

let instance : Cache | undefined;

export const cache = () => {
    if (!instance) {
        instance = new Cache();
        setInterval(() => instance?.clean(), 1000 * 60 * 60);
    }

    return instance;
}