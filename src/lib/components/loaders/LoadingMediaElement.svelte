<script lang="ts">
  import Pixels from "$lib/components/loaders/effects/Pixels.svelte";
  import Bubble from "$lib/components/loaders/effects/Bubble.svelte";
  import Twinkle from "$lib/components/loaders/effects/Twinkle.svelte";

  let {
        width,
        height,
        thumbnail,
        loading,
        variant = 'pixels'
      }: {
    width: number,
    height: number,
    thumbnail: string,
    loading: boolean
    variant: 'pixels' | 'twinkle' | 'bubbles'
  } = $props();

  let noGL = $state(false);

</script>

<div class="relative  z-10 overflow-hidden">
    {#if variant === 'pixels'}
        <Pixels active={loading} width={width} height={height} thumbnail={thumbnail}/>
    {:else if variant === 'twinkle' && !noGL}
        <Twinkle active={loading} width={width} height={height} thumbnail={thumbnail} bind:failed={noGL}/>
    {:else}
        <Bubble active={loading} width={width} height={height} thumbnail={thumbnail}/>
    {/if}
</div>