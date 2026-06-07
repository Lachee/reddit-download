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

        <SearchBar/>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 dark:text-gray-400">
        <span class="flex min-h-40 flex-col rounded-2xl border border-stone-300 bg-stone-100/89 hover:bg-stone-200 dark:border-cliff-700 dark:bg-cliff-900/80 p-6 transition dark:hover:bg-cliff-800">
            <h3 class="text-lg font-bold text-gray-900 dark:text-cliff-100">
                Use Reddit URLs directly
            </h3>

            <p class="mt-3 flex-1 text-sm text-cliff-300">
                Paste or open URLs using the dl-reddit.com format, like
                <span class="font-mono text-orange-600 break-keep">dl-reddit.com/r/...</span>,<br/>
                to download Reddit media quickly.
            </p>
        </span>
            <span class="flex min-h-40 flex-col rounded-2xl border border-stone-300 bg-stone-100/89 hover:bg-stone-200 dark:border-cliff-700 dark:bg-cliff-900/80 p-6 transition dark:hover:bg-cliff-800">
            <h3 class="text-lg font-bold text-gray-900 dark:text-cliff-100">
                    Self-hostable
                </h3>

                <p class="mt-3 flex-1 text-sm text-cliff-300">
                    Fully open source and self-hostable.
                    Keep control of your own instance for the fastest most reliable downloads.
                </p>
            </span>
            <span class="flex min-h-40 flex-col rounded-2xl border border-stone-300 bg-stone-100/89 hover:bg-stone-200 dark:border-cliff-700 dark:bg-cliff-900/80 p-6 transition dark:hover:bg-cliff-800">
            <h3 class="text-lg font-bold text-gray-900 dark:text-cliff-100">
                    Better than RapidSave
                </h3>

                <p class="mt-3 flex-1 text-sm text-cliff-300">
                    No ads, no watermarks, and best-quality downloads where available.
                    Just the Reddit media without the extra junk.
                </p>
            </span>
        </div>
    </div>
</div>
