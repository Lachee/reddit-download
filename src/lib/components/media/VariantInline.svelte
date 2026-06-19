<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, type Variant, VariantType } from "$lib/reddit/Media";
  import DownloadIcon from "$lib/components/icons/DownloadIcon.svelte"

  let {
        post,
        media,
        variant,
        permalink
      }: {
    post: Post
    media: Media
    variant: Variant
    permalink: string
  } = $props();

  let type = $derived(variant.type);
  let hover = $state(false);

</script>

<div
        class="rounded-lg overflow-hidden relative max-w-full   border-2 border-gray-200
        dark:border-cliff-400 p-4 flex justify-between flex-row gap-2 items-center flex-wrap"
>

    <img alt="Preview thumbnail"
         class="rounded-xl border-4 border-gray-200 dark:border-black h-40 object-cover"
         src="/i/{permalink}?media={media.id}&size=thumbnail"/>

    <div class="flex gap-2 not-xs:grow">
        {#if type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio}
            <a href="/v/{permalink}?media={media.id}&size=best"
               class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow"
               download>
                <DownloadIcon/>
                Video
            </a>
        {/if}
        {#if type !== VariantType.Image }
            <a href="/g/{permalink}?media={media.id}&size=best"
               class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow "
               download>
                <DownloadIcon/>
                GIF
            </a>
        {:else}
            <a href="/i/{permalink}?media={media.id}&size=best"
               class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow"
               download>
                <DownloadIcon/>
                Image
            </a>
        {/if}
    </div>
</div>
