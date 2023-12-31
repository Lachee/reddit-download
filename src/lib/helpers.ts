

/**
 * Gets the extension of the given file
 * @param filePath 
 * @returns 
 */
export function extname(filePath : string) : string {
    const i = filePath.lastIndexOf('.');
    if (i < 0) return '';
    return filePath.substring(i+1);
}

/**
 * Gets the root level domain from the given url
 * @param url the URL to get the root domain off
 * @returns 
 */
export function rootDomain(url: string) : string {
    return (new URL(url)).hostname.split('.').reverse().splice(0, 2).reverse().join('.');
} 

/** Creates a download proxy url */
export function proxyDownload(url : string|URL, fileName? : string) : string {
    if (typeof url !== 'string') 
        url = url.toString();

    const params : Record<string,string> = {
        get: url,
    };

    if (fileName)
        params.fileName = fileName;

    return `/download?` + new URLSearchParams(params).toString();
}

/**
 * Strips the query parameters
 * @param url The URL to string the query from
 * @returns 
 */
export function stripQueryParameters(url : string) : string {
    const indexOfParam = url.indexOf("?");
    if (indexOfParam > 0) return url.slice(0, indexOfParam - 1);
    return url;
}