<script lang="ts">
    //@ts-ignore. We expect the virtual module to fail here
    import { pwaInfo } from "virtual:pwa-info";

    import "./layout.css";
    import LoadingBar from "$lib/components/LoadingBar.svelte";
    import ThemeToggle from "$lib/components/ThemeToggle.svelte";
    import DisplayToggle from "$lib/components/DisplayToggle.svelte";
    let { children } = $props();

    let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : "");
</script>

<svelte:head>
    {@html webManifestLink}
    <meta name="theme-color" content="#FF5700" />
    <link rel="icon" href="/favicon.png" />
</svelte:head>

<LoadingBar />

<div class="min-h-screen bg-stone-50 dark:bg-cliff-700 flex flex-col">
    <header class="p-6">
        <nav class="max-w-7xl mx-auto flex justify-between items-center">
            <a href="/" class="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2" data-sveltekit-reload>
                <span class="bg-orange-600 text-white p-1 rounded">DL</span>
                <span>Reddit</span>
            </a>
            <div class="flex gap-6 text-sm font-medium dark:text-stone-50 items-center">
                <DisplayToggle />
                <ThemeToggle />
                <a href="https://github.com/Lachee/reddit-download/" target="_blank" class="hover:text-orange-600">GitHub</a>
            </div>
        </nav>
    </header>

    <main class="grow">
        {@render children()}
    </main>

    <footer class="p-12 border-t border-cliff-100 bg-white dark:bg-cliff-700 dark:border-cliff-700">
        <div class="max-w-7xl mx-auto text-center dark:text-stone-50 text-sm">
            <p>Not affiliated with Reddit. <a class="hover:underline" href="https://github.com/Lachee/reddit-download/" target="_blank">Self Host</a> today!</p>
        </div>
    </footer>
</div>
