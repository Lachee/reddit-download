
export type RangeSlice = {
    slice : Uint8Array<ArrayBuffer>,
    status: 206,
    headers: Record<string, string>,
}

export function range(request : Request, content : Uint8Array<ArrayBuffer>) : RangeSlice | undefined {
    const range = request.headers.get('range');
    if (range) {
        const total = content.length;
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunksize = (end - start) + 1;

        const slice = content.slice(start, end + 1);
        return {
            slice,
            status: 206,
            headers: {
                "Content-Range":       `bytes ${start}-${end}/${total}`,
                "Accept-Ranges":      "bytes",
                "Content-Length":      `${chunksize}`,
            },
        }
    }

    return undefined;
}