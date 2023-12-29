

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

export function proxy(url : string|URL, fileName? : string) : string {
    if (typeof url !== 'string') 
        url = url.toString();

    const params : Record<string,string> = {
        get: url,
    };

    if (fileName)
        params.fileName = fileName;

    return `/download?` + new URLSearchParams(params).toString();
}