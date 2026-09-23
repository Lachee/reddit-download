<script lang="ts">
    import {fade} from "svelte/transition";
    import {onMount} from "svelte";

    import GalleryIcon from "$lib/components/icons/DensityImage.svelte";
    import ListIcon from "$lib/components/icons/TableRows.svelte";
    import {Events, track, trackOnce} from "$lib/Analytics";
    import {
        display,
        initDisplayMode,
        toggleDisplayMode,
    } from "$lib/state/DisplayMode.svelte";

    const REPORTED_KEY = "display-reported";

    function onToggleClick() {
        toggleDisplayMode();
        track(Events.DisplayMode, {mode: display.mode, source: "toggle"});
    }

    onMount(() => {
        initDisplayMode();
        trackOnce(REPORTED_KEY, Events.DisplayMode, {mode: display.mode, source: "session"});
    });
</script>

<button
        type="button"
        onclick={onToggleClick}
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
