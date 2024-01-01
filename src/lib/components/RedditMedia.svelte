<script lang="ts">
  import { Variant, type Media } from "$lib/reddit2";

  export let media: Media;
  export let alt: string = "";
  export let blur: boolean = false;
</script>

{#if media.variant === Variant.Video}
  <video src={media.href} autoplay controls muted loop class:blur-lg={blur} />
{:else}
  <img
    src={`/api/proxy?href=${encodeURIComponent(media.href)}`}
    alt={alt || media.href}
    class:blur-lg={blur}
    class="snap-center w-[1024px] rounded-container-token"
    loading="lazy"
  /><br />
{/if}

<!--
    
        <img
          class="snap-center w-[1024px] rounded-container-token"
          src="https://source.unsplash.com/{unsplashId}/1024x768"
          alt={unsplashId}
          loading="lazy"
        />
-->
