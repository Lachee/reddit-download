export function load({ setHeaders, url }) {
	const oembedRoute = `${url.origin}/api/reddit/oembed?url=${encodeURIComponent(url.toString())}`;

	// These headers are required to make FFMPEG WASM work
	setHeaders({
		'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
		'Link': '<'+oembedRoute+'>; rel="alternate"; type="application/json+oembed"; title="reddit"'
	});
}