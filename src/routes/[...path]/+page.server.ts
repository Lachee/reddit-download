export const prerender = 'auto';

import { CLIENT_ID, CLIENT_SECRET, BOT_USERNAME, BOT_PASSWORD } from '$env/static/private';
import type { PageServerLoad } from './$types';

import { type Post, getMediaAuthenticated } from "$lib/reddit";

const CrawlerUserAgents = [
	'Iframely',
	'Discordbot',
	//'Moz',
];

type PageData = {
	source: string,
	reddit?: Post,
}

/** Gets the redit post. */
async function getPost(link : string) : Promise<Post|undefined> { 
	try {
		const post = await getMediaAuthenticated(link, BOT_USERNAME, BOT_PASSWORD, CLIENT_ID, CLIENT_SECRET);
		return post;
	}catch(e) {
		console.error('failed to fetch the post media', e);
		return undefined;
	}
}

/** Determines if the request should be SSR */
function isSSR(request : Request) : boolean {
	const ua =  request.headers.get('user-agent') || '';
	return CrawlerUserAgents.find(v => ua.includes(v)) !== undefined;
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
	if (params.path != null && isSSR(request)) {
		console.log('page should be ssr');
		pageData.reddit = await getPost(pageData.source);
	}

	return pageData;
}

