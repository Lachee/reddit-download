<script lang="ts">
    import { onMount } from "svelte";
    import { Events, track } from "$lib/Analytics";

    const SHORTCUT_URL = "/dlreddit.shortcut";

    let mode: "none" | "pwa" | "ios" = $state("none");

    function isIOS(): boolean {
        // iPadOS reports itself as a Mac, so check for touch support too.
        return /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
    }

    onMount(() => {
        if (isIOS()) {
            mode = "ios";
            return;
        }

        // The prompt is captured in app.html, as it can fire before we mount.
        const update = () => mode = window.deferredInstallPrompt ? "pwa" : "none";
        update();

        window.addEventListener("installpromptready", update);
        window.addEventListener("appinstalled", update);
        return () => {
            window.removeEventListener("installpromptready", update);
            window.removeEventListener("appinstalled", update);
        };
    });

    async function onInstall() {
        const prompt = window.deferredInstallPrompt;
        if (!prompt)
            return;

        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        track(Events.Install, { platform: "pwa", outcome });

        // A prompt can only be used once.
        window.deferredInstallPrompt = null;
        mode = "none";
    }
</script>

{#if mode === "pwa"}
    <button type="button" onclick={onInstall} class="cursor-pointer hover:text-orange-600">Install</button>
{:else if mode === "ios"}
    <a href={SHORTCUT_URL} download="dlreddit.shortcut" onclick={() => track(Events.Install, { platform: "ios" })}
       class="hover:text-orange-600" title="Add the DL Reddit shortcut to your share sheet">Get Shortcut</a>
{/if}
