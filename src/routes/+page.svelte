<script lang="ts">
    import SearchBar from "$lib/components/SearchBar.svelte";
</script>

<svelte:head>
    <title>Reddit Downloader</title>
</svelte:head>

<div class="min-h-[80vh] flex flex-col items-center justify-center px-4">
    <div class="max-w-4xl w-full text-center space-y-8">
        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 ">
            Download <span class="text-orange-600">Reddit</span> Videos
        </h1>

        <SearchBar />

        <div class="pt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span>Open Source</span>
            <span>Self-Hostable</span>
            <span>No Data-Harvesting</span>
        </div>
    </div>
</div>
