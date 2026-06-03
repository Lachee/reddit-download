<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
    import LoadingBar from "$lib/components/LoadingBar.svelte";
	let { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<LoadingBar />

<div class="min-h-screen bg-gray-50 flex flex-col">
    <header class="p-6">
        <nav class="max-w-7xl mx-auto flex justify-between items-center">
            <a href="/" class="text-2xl font-black text-gray-900 flex items-center gap-2" data-sveltekit-reload>
                <span class="bg-orange-600 text-white p-1 rounded">dl</span>
                <span>Reddit</span>
            </a>
            <div class="flex gap-6 text-sm font-medium text-gray-500">
                <a href="https://github.com/Lachee/reddit-download/" target="_blank" class="hover:text-orange-600">GitHub</a>
            </div>
        </nav>
    </header>

    <main class="flex-grow">
        {@render children()}
    </main>

    <footer class="p-12 border-t border-gray-100 bg-white">
        <div class="max-w-7xl mx-auto text-center text-gray-400 text-sm">
            <p>Not affiliated with Reddit. <a href="https://github.com/Lachee/reddit-download/" target="_blank">Self Host</a> today!</p>
        </div>
    </footer>
</div>
