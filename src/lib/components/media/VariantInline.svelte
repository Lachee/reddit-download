<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, type Variant, VariantType } from "$lib/reddit/Media";
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import { getDownloadLink } from "$lib/reddit/Download";

  let {
        post,
        media,
        variant,
        medialink
      }: {
    post: Post
    media: Media
    variant: Variant
    medialink: string
  } = $props();

  let type = $derived(variant.type);
  let link = $derived(getDownloadLink(medialink, media));
  let gifLink = $derived(getDownloadLink(medialink, media, true));
</script>

<div
        class="rounded-lg overflow-hidden relative max-w-full   border-2 border-gray-200
        dark:border-cliff-400 p-4 flex justify-between flex-row gap-2 items-center flex-wrap"
>

  <img alt="Preview thumbnail"
       class="rounded-xl border-4 border-gray-200 dark:border-black h-40 object-cover"
       src="/i/{medialink}?m={media.id}&s=thumbnail"/>

  <div class="flex gap-2 not-xs:grow">
      {#if type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio}
        <DownloadButton href={link}>Video</DownloadButton>
        <DownloadButton href={gifLink}>GIF</DownloadButton>
      {:else}
        <DownloadButton href={link}>
          {#if type === VariantType.Image}
            Image
          {:else}
            GIF
          {/if}
        </DownloadButton>
      {/if}
  </div>
</div>
