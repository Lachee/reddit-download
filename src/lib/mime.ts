export const MIME : Record<string, string> = {
    'bmp': 'image/bmp',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'tif': 'image/tiff',
    'tiff': 'image/tiff',
    'svg': 'image/svg+xml',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mpeg': 'video/mpeg',
    'webp': 'image/webp',
    'webm': 'video/webm',
    'weba': 'audio/weba',
    'mp3': 'audio/mp3',
};

/**
 * Gets the extnesion for the given mime
 * @param mime the MIME
 * @returns 
 */
export function extmime(mime : string) : string {
    // map invalid image/jpg to image/jpeg
    mime = mime.toLowerCase();
    if (mime === 'image/jpg') 
        mime = 'image/jpeg';

    // Find the appropriate file extension
    for(const ext in MIME) {
        if (MIME[ext] === mime)
            return ext;
    }

    // None found, so we will just use the last part of the mime.
    const slash = mime.indexOf('/');
    if (slash >= 0) return mime.substring(slash);
    return 'dat';
}