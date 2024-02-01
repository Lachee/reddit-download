export const prerender = 'auto';

import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import type { PageServerLoad } from './$types';

import { type Post, getMedia, follow } from "$lib/reddit";
import { getCache, normalize } from '$lib/cache';

import logger from '$lib/log';
const { log, error } = logger('page');

const credentials = { username: BOT_USERNAME, password: BOT_PASSWORD, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET };

const CrawlerUserAgents = [
	'Iframely',
	'Discordbot',
	'Android',
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
		const cached = await getCache().get(normalize(`reddit:media:${url}`));
		if (cached != null) 
			return JSON.parse(cached) as Post; 

		// Cache miss, pull it another way
		const post = await getMedia(url.toString(), { credentials });
		await getCache().put(normalize(`reddit:media:${url}`), JSON.stringify(post), { expirationTtl: 86400*7 });
		return post;
	}catch(e) {
		error('failed to fetch the post media', e);
		return undefined;
	}
}

/** Determines if the request should be SSR */
function isServerLoaded(request : Request) : boolean {
	const ua =  request.headers.get('user-agent') || '';
	return CrawlerUserAgents.find(v => ua.includes(v)) !== undefined || (new URL(request.url)).searchParams.get('prefetch') === 'true';
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
	if (params.path != null && params.path != '' && isServerLoaded(request)) {
		log('prefetching reddit post');
		pageData.reddit = await loadPost(pageData.source);
	}

	return pageData;
}

