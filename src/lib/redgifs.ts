
const BASE_URI : string = "https://api.redgifs.com";

interface AuthToken {
    token : string
    addr : string
    agent : string
    session : string
    rtfm : string 
}

interface GifResponse {
    gif : Gif
    user : unknown|null,
    niches : string[]
}

interface URLCollection {
    hd : string|null
    poster : string|null
    sd : string|null
    vthumbnail : string|null
    thumbnail : string|null
}

export interface Gif {
    id : string
    permalink : string
    client_id : string|null
    createDate : number
    hasAudio : boolean
    width : number
    height : number
    hls : boolean
    likes : number
    niches : string[]
    tags : string[] 
    verified : boolean
    views : number|null
    description : string|null
    duration : number
    published : boolean
    urls : URLCollection
    userName : string
    type : number
    avgColor : string
    gallery : unknown|null
    hideHome : boolean
    hideTrending : false
    sexuality : string[]
}

function cleanID(url : string) : string {
    const w = url.lastIndexOf('watch/');
    if (w < 0) return url;    
    return url.substring(w+6);
}

class API {

    private auth : AuthToken|null = null;

    private async login() : Promise<AuthToken> {
        // Username & Password login not yet available
        console.log('[REDGIFS] Creating a temporary auth token');
        const response = await fetch(`${BASE_URI}/v2/auth/temporary`).then(r => r.json());
        if (!response['token']) 
            throw new Error('Failed to fetch the temporary auth token');
        this.auth = response as AuthToken;
        return this.auth;
    }
    
    async fetchGif(id : string) : Promise<Gif> {
        const gif = (await this.request<GifResponse>(`/v2/gifs/${cleanID(id)}`)).gif;
        return { ...gif, permalink: `https://www.redgifs.com/watch/${gif.id}` };
    }

    async downloadGif(id : string|Gif) : Promise<ReadableStream<Uint8Array>|null> {
        const gif = typeof id === 'string'
                        ? await this.fetchGif(id)
                        : id;
        
        const bestVersion = gif.urls.hd || gif.urls.sd;
        if (bestVersion == null)
            throw new Error("Unable to find any video files");
        
        const url = new URL(bestVersion);
        if (!url.host.includes('thumbs') && !url.host.includes("redgifs"))
            throw new Error("Badly formatted URL. Will need to fetch the gif again.");


        return await this.download(url.toString());
    }

    private async download(url : string) : Promise<ReadableStream<Uint8Array>|null> {
        if (this.auth == null)  // Auto Login, but if we fail then just give up
        await this.login();
        if (this.auth == null) 
            throw new Error("Failed to login");
                
        const response = await fetch(url, {
            headers: {
                'authorization': `Bearer ${this.auth.token}`
            }
        });

        if (response.status == 200)
            return response.body;

        // We require to login again
        if (response.status == 401) {
            console.warn('Failed to fetch teh endpoint because we are unauthorised. Generating a new token');
            await this.login();
            return await this.download(url);
        }

        console.error('failed to download data!', response.status, response.statusText, await response.text());
        throw new Error('Failed to download request!');
    }
    private async request<T>(endpoint : string) : Promise<T> {
        if (this.auth == null)  // Auto Login, but if we fail then just give up
            await this.login();
        if (this.auth == null) 
            throw new Error("Failed to login");
        
        // Make the request
        const response = await fetch(`${BASE_URI}${endpoint}`, {
            headers: {
                'authorization': `Bearer ${this.auth.token}`
            }
        });

        // Return the object if success
        if (response.status == 200)
            return (await response.json()) as T;

        // We require to login again
        if (response.status == 401) {
            console.warn('Failed to fetch teh endpoint because we are unauthorised. Generating a new token');
            await this.login();
            return await this.request<T>(endpoint);
        }
        
        // Something else exploded
        console.error('failed to fetch data!', response.status, response.statusText, await response.text());
        throw new Error('Failed to fetch request!');
    }
}

export const redgif = new API();
export async function fetchProxy(url : string) : Promise<Gif> {
    return await fetch('/redgif?get=' + encodeURIComponent(url)).then(r => r.json());
}