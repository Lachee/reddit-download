export function load({ setHeaders, url }) {
	// These headers are required to make FFMPEG WASM work
	setHeaders({
		'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
		'Link': `<${url.origin}/api/reddit/oembed?url=${encodeURIComponent(url.pathname)}>; rel="alternate"; type="application/json+oembed"; title="reddit"`
	});
}