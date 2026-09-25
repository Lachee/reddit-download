<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, sort } from "$lib/reddit/Media";
  import { display } from '$lib/state/DisplayMode.svelte'
  import VariantInline from "$lib/components/media/VariantInline.svelte";
  import VariantPreview from "$lib/components/media/VariantPreview.svelte";

  let {
        post,
        media,
        medialink
      }: {
    post: Post,
    media: Media,
    medialink: string
  } = $props();

  let variant = $derived(sort(media.variants)[0]);
</script>

<svelte:head>
    <link as="image" href="/i/{medialink}?m={media.id}&s=thumbnail" rel="preload"/>
</svelte:head>

{#if display.ready}
    {#if display.mode === 'list'}
        <VariantInline {post} {media} {variant} {medialink} />
    {:else}
        <VariantPreview {post} {media} {variant} {medialink} />
    {/if}
{/if}