<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, type Variant, VariantType, sort as sortVariants } from "$lib/reddit/server/Media";

  let {
        post,
        media
      }: {
    post: Pick<Post, 'title' | 'permalink'>,
    media: Media
  } = $props();

  let loading = $state(true);
  let variant = $derived(sortVariants(media.variants)[0]);
  let type = $derived(variant.type);

  let mediaElement: HTMLImageElement | HTMLVideoElement | HTMLAudioElement | undefined = $state();

  /** The first variant with a defined dimension, used as baseline for sizing. */
  const baselineDimensionalVariant = $derived(variant.dimension ? variant : media.variants.find(m => m.dimension?.width));

  let width = $derived(baselineDimensionalVariant?.dimension?.width ?? 480);
  let height = $derived(baselineDimensionalVariant?.dimension?.height ?? width / (16 / 9));

  const isGifVideo = $derived(
    false
    // post.secure_media?.reddit_video?.is_gif ||
    // post.preview?.reddit_video_preview?.is_gif ||
    // post.url?.endsWith('.gifv')
  );

  function onLoaded() {
    loading = false;
  }

  $effect(() => {
    // Reset loading state when post changes
    void media;
    void post;
    loading = true;

    // We will check if the image is loaded already.
    // Fallback timer to hide loading if it gets stuck
    const timer = setTimeout(() => {
      loading = false;
    }, 2000);

    Promise.resolve().then(() => {
      if (mediaElement) {
        if (mediaElement instanceof HTMLImageElement && mediaElement.complete) {
          onLoaded();
        } else if (mediaElement instanceof HTMLVideoElement && mediaElement.readyState >= 3) {
          onLoaded();
        }
      }
    });

    return () => clearTimeout(timer);
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
        animation: bubble-gradient 4s ease-in-out infinite alternate;
    }

    .bubble-gradient.loaded {
        opacity: 0;
        pointer-events: none;
    }

    .bubble-gradient::after {
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

<div
        class="rounded-lg overflow-hidden relative h-full m-auto"
        style="max-height: {Math.min(height, 800)}px;  aspect-ratio: {width} / {height};"
>
    <div class="bubble-gradient" class:loaded={!loading}></div>

    <div class="w-full h-full">
        {#if type === VariantType.GIF}
            <img bind:this={mediaElement} class="w-full h-auto" src="/g/{post.permalink.substring(3)}?media={media.id}"
                 alt="Cannot Load: {media.id}" onload={onLoaded}/>
        {:else if type ===  VariantType.Video || type === VariantType.PartialVideo}
            <video bind:this={mediaElement}
                   class="w-full h-full"
                   controls={!isGifVideo}
                   autoplay={isGifVideo}
                   muted={isGifVideo}
                   loop={isGifVideo}
                   playsinline
                   src="/v/{post.permalink.substring(3)}?media={media.id}"
                   oncanplay={onLoaded}></video>
        {:else if type === VariantType.PartialAudio}
            <span>Audio is not fully supported</span>
            <audio bind:this={mediaElement} src={variant.href} controls oncanplay={onLoaded} />
        {:else}
            <img bind:this={mediaElement} class="w-full h-auto" src="/i/{post.permalink.substring(3)}?media={media.id}"
                 alt="Cannot Load: {media.id}" onload={onLoaded}/>
        {/if}
    </div>
</div>
