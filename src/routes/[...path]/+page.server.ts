export const prerender = 'auto';

import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import type { PageServerLoad } from './$types';

import { type Post, getMediaAuthenticated, follow } from "$lib/reddit";
import { getCache } from '$lib/cache';

const CrawlerUserAgents = [
	'Iframely',
	'Discordbot',
];

type PageData = {
	source: string,
	reddit?: Post,
}

/** Gets the redit post. */
async function loadPost(link : string) : Promise<Post|undefined> { 
	try {
		const url = await follow(link);

		// Try the cache
		const cached = await getCache().get(`reddit:media:${url}`);
		if (cached != null) 
			return JSON.parse(cached) as Post; 

		// Cache miss, pull it another way
		const post = await getMediaAuthenticated(url.toString(), BOT_USERNAME, BOT_PASSWORD, CLIENT_ID, CLIENT_SECRET);
		await getCache().put(`reddit:media:${url}`, JSON.stringify(post), { expirationTtl: 86400 });
		return post;
	}catch(e) {
		console.error('failed to fetch the post media', e);
		return undefined;
	}
}

/** Determines if the request should be SSR */
function isServerLoaded(request : Request) : boolean {
	const ua =  request.headers.get('user-agent') || '';
	return CrawlerUserAgents.find(v => ua.includes(v)) !== undefined || (new URL(request.url)).hostname == 'localhost';
}

export const load: PageServerLoad = async ({ setHeaders, params, request } ) => {
   

	// These headers are required to make FFMPEG WASM work
	setHeaders({
		'Cross-Origin-Embedder-Policy': 'require-corp',
		'Cross-Origin-Opener-Policy': 'same-origin',
	});

	// Prepare the page data
	const pageData : PageData = {
		source: params.path != '' ? `https://www.reddit.com/${params.path}/` : ''
	};

	// Perform a SSR search
	if (params.path != null && isServerLoaded(request)) {
		console.log('prefetching reddit post');
		pageData.reddit = await loadPost(pageData.source);
	}

	return pageData;
}

