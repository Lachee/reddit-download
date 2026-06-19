<script lang="ts">
    import {fade} from "svelte/transition";
    import {onMount} from "svelte";

    import GalleryIcon from "$lib/components/icons/DensityImage.svelte";
    import ListIcon from "$lib/components/icons/TableRows.svelte";
    import {
        display,
        initDisplayMode,
        toggleDisplayMode,
    } from "$lib/state/DisplayMode.svelte";

    onMount(() => {
        initDisplayMode();
    });
</script>

<button
        type="button"
        onclick={toggleDisplayMode}
        class="relative grid size-10 place-items-center cursor-pointer hover:text-orange-600 transition-colors"
        aria-label={`Switch to ${display.mode === "gallery" ? "list" : "gallery"} view`}
>
    {#key display.mode}
    <span
            class="absolute inset-0 grid place-items-center"
            in:fade={{ duration: 120 }}
            out:fade={{ duration: 120 }}
    >
      {#if display.mode === "list"}
        <ListIcon/>
      {:else}
        <GalleryIcon/>
      {/if}
    </span>
    {/key}
</button>