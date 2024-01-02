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

/** Extension from mime */
export function extmime(mime : string) : string {
    for(const ext in MIME) {
        if (MIME[ext] === mime)
            return ext;
    }

    const slash = mime.indexOf('/');
    if (slash >= 0) return mime.substring(slash);
    return 'dat';
}