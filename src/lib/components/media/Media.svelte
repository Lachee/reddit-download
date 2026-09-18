<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, sort } from "$lib/reddit/Media";
  import { normalizeMedialink } from "$lib/reddit/Utilities";
  import { display } from '$lib/state/DisplayMode.svelte'
  import VariantInline from "$lib/components/media/VariantInline.svelte";
  import VariantPreview from "$lib/components/media/VariantPreview.svelte";

  let {
        post,
        media
      }: {
    post: Post,
    media: Media
  } = $props();

  let variant = $derived(sort(media.variants)[0]);
  let medialink = $derived(normalizeMedialink(post.permalink));
</script>

<svelte:head>
    <link as="image" href="/i/{medialink}?media={media.id}&size=thumbnail" rel="preload"/>
</svelte:head>

{#if display.ready}
    {#if display.mode === 'list'}
        <VariantInline {post} {media} {variant} {medialink} />
    {:else}
        <VariantPreview {post} {media} {variant} {medialink} />
    {/if}
{/if}