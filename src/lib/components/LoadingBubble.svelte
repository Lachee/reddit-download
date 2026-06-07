<script lang="ts">


  import type { Post } from "$lib/reddit/schema/postSchema";
  import type { Media } from "$lib/reddit/server/Media";

  let {
        mediaElement,
        width,
        height
      }: {
    mediaElement: HTMLImageElement | HTMLVideoElement | undefined,
    width: number,
    height: number,
  } = $props();

  let completed = $state(false);
  let loading = $derived(!completed || mediaElement === undefined)

  function onLoaded() {
    console.log('[bubble] loaded')
    completed = true;
  }

  function onError() {
    console.log('[bubble] loaded (error)')
    completed = true;
  }

  $effect(() => {
    void mediaElement;

    console.log('[bubble] unloaded (element changed)');
    completed = false;

    if (mediaElement) {
      mediaElement.addEventListener('error', onError);
      mediaElement.addEventListener('canplay', onLoaded);
      mediaElement.addEventListener('load', onLoaded);
      mediaElement.addEventListener('loadeddata', onLoaded);


      if (mediaElement instanceof HTMLImageElement && mediaElement.complete) {
        onLoaded();
      } else if (mediaElement instanceof HTMLVideoElement && mediaElement.readyState >= 3) {
        onLoaded();
      }
    }

    return () => {
      mediaElement?.removeEventListener('error', onError);
      mediaElement?.removeEventListener('canplay', onLoaded);
      mediaElement?.removeEventListener('load', onLoaded);
      mediaElement?.removeEventListener('loadeddata', onLoaded);
    }
  });
</script>


<style>
    .bubble-gradient {
        position: absolute;
        inset: 0;
        overflow: hidden;
        z-index: 10;
        transition: opacity 0.4s ease-out;

        background: radial-gradient(circle at 20% 30%, rgba(244, 114, 182, 0.85), transparent 30%),
        radial-gradient(circle at 80% 25%, rgba(125, 211, 252, 0.85), transparent 32%),
        radial-gradient(circle at 50% 85%, rgba(134, 239, 172, 0.7), transparent 34%),
        radial-gradient(circle at 15% 85%, rgba(253, 224, 71, 0.75), transparent 28%),
        radial-gradient(circle at 85% 80%, rgba(196, 181, 253, 0.8), transparent 32%),
        linear-gradient(135deg, #fdf2f8, #eff6ff);

        background-size: 130% 130%;
        animation: bubble-gradient 3s ease-in-out infinite alternate;
    }

    .bubble-gradient.loaded {
        opacity: 0;
        pointer-events: none;
    }

    .bubble-gradient::before {
        content: "";
        position: absolute;
        inset: 0;
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
        background: rgba(255, 255, 255, 0.12);
    }

    @keyframes bubble-gradient {
        0% {
            background-position: 0% 0%,
            100% 10%,
            50% 100%,
            0% 100%,
            100% 100%,
            center;
        }

        50% {
            background-position: 35% 20%,
            70% 45%,
            60% 70%,
            25% 80%,
            80% 60%,
            center;
        }

        100% {
            background-position: 10% 45%,
            95% 30%,
            35% 85%,
            40% 95%,
            70% 75%,
            center;
        }
    }
</style>

<div class="bubble-gradient" class:loaded={!loading}>Loading</div>
{#if loading}
    <div style="width: {width}px; height: {height}px"></div>
{/if}
