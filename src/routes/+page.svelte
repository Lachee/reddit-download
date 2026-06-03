<script lang="ts">
    import { goto } from '$app/navigation';
    import { normalizePermalink } from "$lib/reddit/Utilities";

    let url = $state('');

    function handleSubmit(e: Event) {
        e.preventDefault();
        if (!url) return;

        const trimmedUrl = url.trim();
        if (!trimmedUrl) return;

        // Try to normalize the permalink from the URL
        const permalink = normalizePermalink(trimmedUrl);
        goto(`/${permalink}`);
    }
</script>

<svelte:head>
    <title>Reddit Downloader</title>
</svelte:head>

<div class="min-h-[80vh] flex flex-col items-center justify-center px-4">
    <div class="max-w-3xl w-full text-center space-y-8">
        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900">
            Download <span class="text-orange-600">Reddit</span> Videos
        </h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Screw dealing with ad laiden downloaders. <br/>
            Just paste the link and get the content. No-faf, no sign up.
        </p>

        <form onsubmit={handleSubmit} class="relative max-w-2xl mx-auto group">
            <input
                type="url"
                bind:value={url}
                placeholder="https://www.reddit.com/r/subreddit/comments/..."
                class="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none pr-32"
                required
            />
            <button
                type="submit"
                class="absolute right-2 top-2 bottom-2 px-6 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
            >
                Go
            </button>
        </form>

        <div class="pt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span>Ad Free Always</span>
            <span>No Data Collection</span>
            <span>Self-Hostable</span>
        </div>
    </div>
</div>
