<script lang="ts" module>
    export type Mode = "auto" | "light" | "dark";
</script>

<script lang="ts">
    import { fade } from "svelte/transition";
    import DarkModeIcon from "$lib/components/icons/DarkModeIcon.svelte";
    import LightModeIcon from "$lib/components/icons/LightModeIcon.svelte";
    import LightModeAutoIcon from "$lib/components/icons/LightModeAutoIcon.svelte";
    import {onMount} from "svelte";

    let mode: Mode|'none' = $state("none");

    onMount(() => {
        const stored = localStorage.getItem("theme");
        mode = (stored ?? 'auto') as Mode;
    })

    $effect(() => {
        document.documentElement.setAttribute("data-theme", mode);
        localStorage.setItem("theme", mode);
    });

    function onClick() {
        switch (mode) {
            case "auto":
                mode = "dark";
                break;
            case "dark":
                mode = "light";
                break;
            case "light":
            default:
                mode = "auto";
                break;
        }
    }
</script>

<button type="button" onclick={onClick} class="relative grid size-10 place-items-center cursor-pointer hover:text-orange-600 transition-colors">
    {#key mode}
        <span
                class="absolute inset-0 grid place-items-center"
                in:fade={{ duration: 120 }}
                out:fade={{ duration: 120 }}
        >
            {#if mode === "auto"}
                <LightModeAutoIcon />
            {:else if mode === "light"}
                <LightModeIcon />
            {:else if mode === "dark"}
                <DarkModeIcon />
            {/if}
        </span>
    {/key}
</button>