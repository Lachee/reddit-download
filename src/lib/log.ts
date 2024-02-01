
export type Logger = {
    prefix: string,
    log: (...args: any[]) => void,
    warn: (...args: any[]) => void,
    error: (...args: any[]) => void,
    group: (...args : any[]) => void,
    groupEnd: () => void,
}

export const DefaultFormatter = (prefix : string) => {
    const now = new Date();
    return now.toLocaleTimeString() + ` [${prefix.toLowerCase()}]`
}

export default function logger(prefix : string, formatter? : (prefix : string) => string) : Logger {
    const p = (formatter ?? DefaultFormatter);
    return {
        prefix,
        log: (...args: any[])    => console.log(p(prefix), ...args),
        warn: (...args: any[])   => console.warn(p(prefix), ...args),
        error: (...args: any[])  => console.error(p(prefix), ...args),
        group: (...args : any[]) => console.group(p(prefix), ...args),
        groupEnd: () => console.groupEnd()
    }
}
