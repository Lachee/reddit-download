<script lang="ts">
  import { Variant, type Media } from "$lib/reddit2";

  export let media: Media;
  export let alt: string = "";
  export let blur: boolean = false;

  let title = "";
  $: {
    title = `${media.href} (${media.variant})`;
    if (media.dimension && media.dimension.height)
      title = `${title} (${media.dimension.width}x${media.dimension.height})`;
  }

  function onImageError(evt: Event) {
    const elm = evt.target;
    if (elm == null || !(elm instanceof HTMLImageElement)) return;
    if (elm.src.startsWith("/")) return;
    elm.src = `/api/proxy?href=${encodeURIComponent(elm.src)}`;
  }
</script>

<div>
  <div>{media.href}</div>
  <div>
    {#if media.variant === Variant.Video}
      <video
        src={media.href}
        autoplay
        controls
        muted
        loop
        class:blur-lg={blur}
      />
    {:else}
      <img
        src={media.href}
        on:error={onImageError}
        alt={alt || media.href}
        class:blur-lg={blur}
        class="snap-center w-[1024px] rounded-container-token"
        loading="lazy"
      /><br />
    {/if}
  </div>
</div>

<!--
    
        <img
          class="snap-center w-[1024px] rounded-container-token"
          src="https://source.unsplash.com/{unsplashId}/1024x768"
          alt={unsplashId}
          loading="lazy"
        />
-->
