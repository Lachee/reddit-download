import { MIME } from "./mime";

import { page } from '$app/stores';
import { get } from "svelte/store";
export const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

/**
 * Gets the extension of the given file
 * @param filePath 
 * @returns 
 */
export function extname(filePath: string): string {
    const i = filePath.lastIndexOf('.');
    if (i < 0) return '';
    return filePath.substring(i + 1);
}

/**
 * Gets the root level domain from the given url
 * @param url the URL to get the root domain off
 * @returns 
 */
export function rootHostname(url: string | URL): string {
    if (typeof url === 'string') url = new URL(url);
    return url.hostname.split('.').reverse().splice(0, 2).reverse().join('.');
}

/**
 * Proxies the given url via the media proxy
 * @param url The URL to proxy
 * @param fileName The fileName to give the media
 * @param download Include the download header
 * @returns 
 */
export function proxy(url: string | URL, fileName?: string, download?: boolean, absolute: boolean = false): string {
    if (typeof url !== 'string')
        url = url.toString();

    const params: Record<string, string> = { href: url };

    if (download)
        params.dl = download ? '1' : '0';

    if (fileName)
        params.fileName = fileName;

    const origin = absolute ? get(page).url.origin : '';
    return `${origin}/api/proxy?` + new URLSearchParams(params).toString();
}

/**
 * Strips the query parameters
 * @param url The URL to string the query from
 * @returns 
 */
export function stripQueryParameters(url: string): string {
    const indexOfParam = url.indexOf("?");
    if (indexOfParam > 0) return url.slice(0, indexOfParam - 1);
    return url;
}

/**
 * Validates if the string is a URL object and returns a new URL object if it is.
 * If the href is just a relative basename like /r/..., then a new reddit link is created.
 * @param href the URL to validate
 */
export function validateUrl(href: string, allowedRoots: string[]): URL | null {
    try {
        if (href.startsWith('/r/'))
            href = `https://www.reddit.com${href}`;

        const url = new URL(href);
        const root = rootHostname(url);
        if (allowedRoots.includes(root))
            return url;

    } catch (_) {
        // Ignoring any errors that are caused by creating invalid href.
    }

    return null;
}

export type OGPProperty = { name: string, content: string };

export function createOpenGraph(metadata: OGPProperty[]): string {
    const sanatize = (value : string) => value.replaceAll('"', '\\"');
    const ogtag = (name : string, value : string) => `<meta property="og:${sanatize(name)}" content="${sanatize(value)}" />`;
        
    const ogTags : string[] = [];
    metadata.forEach(property => {
        if (property.name.startsWith('twitter')) {
            ogTags.push(`<meta property="${sanatize(property.name)}" content="${sanatize(property.content)}" />`);
        } else {
            ogTags.push(`<meta property="og:${sanatize(property.name)}" content="${sanatize(property.content)}" />`);
        }
    });

    return ogTags.join('\n');
}