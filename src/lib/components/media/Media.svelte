<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, sort, VariantType } from "$lib/reddit/Media";
  import { normalizePermalink } from "$lib/reddit/Utilities";
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

  /** The first variant with a defined dimension, used as baseline for sizing. */
  let baselineDimensionalVariant = $derived(media.variants.filter(m => m.dimension).sort((a, b) => b.dimension!.height - a.dimension!.height)[0]);
  let permalink = $derived(normalizePermalink(post.permalink).substring(2));


</script>

<svelte:head>
    <link as="image" href="/i/{permalink}?media={media.id}&size=thumbnail" rel="preload"/>
</svelte:head>

{#if display.ready}
    {#if display.mode === 'list'}
        <VariantInline {post} {media} {variant} {permalink} />
    {:else}
        <VariantPreview {post} {media} {variant} {permalink} />
    {/if}
{/if}