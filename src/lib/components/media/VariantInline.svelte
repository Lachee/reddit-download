<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, type Variant, VariantType } from "$lib/reddit/Media";
  import { download } from "$lib/reddit/Download";
  import { Events, getFormat, track } from "$lib/Analytics";
  import DownloadIcon from "$lib/components/icons/DownloadIcon.svelte"
  import SpinnerIcon from "$lib/components/icons/SpinnerIcon.svelte"

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
  let hover = $state(false);
  let downloading = $state('');

  let videoHref = $derived(`/v/${medialink}?m=${media.id}&s=best`);
  let gifHref = $derived(`/g/${medialink}?m=${media.id}&s=best`);
  let imageHref = $derived(`/i/${medialink}?m=${media.id}&s=best`);

  async function onDownloadClick(event: MouseEvent, href: string) {
    event.preventDefault();

    const format = getFormat(href);
    track(Events.Download, { format, converted: format === 'gif' && type !== VariantType.GIF, layout: 'list' });

    downloading = href;
    try {
      await download(href, media.id);
    } finally {
      downloading = '';
    }
  }

</script>

{#snippet icon(href: string)}
    {#if downloading === href}
        <SpinnerIcon/>
    {:else}
        <DownloadIcon/>
    {/if}
{/snippet}

<div
        class="rounded-lg overflow-hidden relative max-w-full   border-2 border-gray-200
        dark:border-cliff-400 p-4 flex justify-between flex-row gap-2 items-center flex-wrap"
>

    <img alt="Preview thumbnail"
         class="rounded-xl border-4 border-gray-200 dark:border-black h-40 object-cover"
         src="/i/{medialink}?m={media.id}&s=thumbnail"/>

    <div class="flex gap-2 not-xs:grow">
        {#if type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio}
            <a href={videoHref}
               class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow"
               onclick={(event) => onDownloadClick(event, videoHref)}
               download>
                {@render icon(videoHref)}
                Video
            </a>
        {/if}
        {#if type !== VariantType.Image }
            <a href={gifHref}
               class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow "
               onclick={(event) => onDownloadClick(event, gifHref)}
               download>
                {@render icon(gifHref)}
                GIF
            </a>
        {:else}
            <a href={imageHref}
               class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow"
               onclick={(event) => onDownloadClick(event, imageHref)}
               download>
                {@render icon(imageHref)}
                Image
            </a>
        {/if}
    </div>
</div>
