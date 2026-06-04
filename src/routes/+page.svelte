<script lang="ts">
    import SearchBar from "$lib/components/SearchBar.svelte";
</script>

<svelte:head>
    <title>Reddit Downloader</title>
</svelte:head>

<div class="min-h-[80vh] flex flex-col items-center justify-center px-4">
    <div class="max-w-4xl w-full text-center space-y-8">
        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900">
            Download <span class="text-orange-600">Reddit</span> Videos
        </h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Just download, no-faf, no sign up, no ads.
        </p>

        <SearchBar />

        <div class="pt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span>Open Source</span>
            <span>Self-Hostable</span>
            <span>No Data-Harvesting</span>
        </div>
    </div>
</div>
