<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, sort, VariantType } from "$lib/reddit/Media";
  import DownloadIcon from "$lib/components/icons/DownloadIcon.svelte"
  import GifIcon from "$lib/components/icons/GifIcon.svelte"
  import IconButton from "$lib/components/IconButton.svelte";
  import LoadingPixels from "$lib/components/LoadingPixels.svelte";
  import { normalizePermalink } from "$lib/reddit/Utilities.ts";
  import { display } from '$lib/state/DisplayMode.svelte'
  import Badge from "$lib/components/Badge.svelte";

  let {
        post,
        media
      }: {
    post: Post,
    media: Media
  } = $props();

  let asGif = $state(false);
  let variant = $derived(sort(media.variants)[0]);
  let type = $derived(variant.type);

  let mediaElement: HTMLImageElement | HTMLVideoElement | undefined = $state();

  /** The first variant with a defined dimension, used as baseline for sizing. */
  let baselineDimensionalVariant = $derived(media.variants.filter(m => m.dimension).sort((a, b) => b.dimension!.height - a.dimension!.height)[0]);
  let width = $derived(baselineDimensionalVariant?.dimension?.width ?? 480);
  let height = $derived(baselineDimensionalVariant?.dimension?.height ?? width / (16 / 9));
  let permalink = $derived(normalizePermalink(post.permalink).substring(2));

  $effect(() => {
    void post;
    asGif = false;
  })

  $effect(() => {
    console.log('[media] post:', { post, media, variant, type, width, height });
  })

  const isGifVideo = $derived(
    post.secure_media?.reddit_video?.is_gif ||
    post.preview?.reddit_video_preview?.is_gif ||
    post.url?.endsWith('.gifv')
  );


  function download(url: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = media.id
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function onDownloadClick() {
    const url = type === VariantType.GIF || asGif
                ? `/g/${permalink}?media=${media.id}`
                : (
                  type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio
                  ? `/v/${permalink}?media=${media.id}`
                  : `/i/${permalink}?media=${media.id}`
                )
    download(url);
  }

  function onGifClick() {
    // const url = `/g/${permalink}?media=${media.id}`;
    // download(url);
    asGif = !asGif;
  }

</script>

<svelte:head>
    <link rel="preload" href="/i/{permalink}?media={media.id}&size=thumbnail" as="image" />
</svelte:head>


{#if display.ready}
    {#if display.mode === 'list'}
        <div class="rounded-lg overflow-hidden relative max-w-full border-2 border-gray-200 dark:border-cliff-400 p-4 flex  flex-wrap gap-2 items-center">
           <div><Badge>{media.type}</Badge></div>
            <div class="grow">{media.id}</div>
            <div class="flex gap-2 not-sm:grow">
                {#if type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio}
                    <a href="/v/{permalink}?media={media.id}&size=best" class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow" download>
                        <DownloadIcon /> Video
                    </a>
                {/if}
                {#if type !== VariantType.Image }
                    <a href="/g/{permalink}?media={media.id}&size=best" class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow " download>
                     <DownloadIcon /> GIF
                    </a>
                {:else}
                    <a href="/i/{permalink}?media={media.id}&size=best" class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow" download>
                     <DownloadIcon /> Image
                    </a>
                {/if}
            </div>
        </div>
    {:else}
        <div
                class="rounded-lg overflow-hidden relative h-full m-auto max-w-full"
                style="max-height: {Math.min(height, 800)}px;  aspect-ratio: {width} / {height};"
        >
            <LoadingPixels
                    height={height}
                    mediaElement={mediaElement}
                    thumbnail="/i/{permalink}?media={media.id}&size=thumbnail"
                    width={width}
            />

            <div class="w-full h-full">
                {#if type === VariantType.GIF || asGif }
                    <img
                            bind:this={mediaElement}
                            class="w-full h-auto"
                            src="/g/{permalink}?media={media.id}&size=best"
                            alt="Cannot Load: {media.id}"
                            decoding="async"
                    />
                {:else if type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio}
                    <video bind:this={mediaElement}
                           class="w-full h-full"
                           controls={true}
                           autoplay={isGifVideo}
                           muted={isGifVideo}
                           loop={isGifVideo}
                           playsinline
                           src="/v/{permalink}?media={media.id}&size=best"
                    >
                    </video>
                {:else}
                    <img
                            bind:this={mediaElement}
                            class="w-full h-auto"
                            src="/i/{permalink}?media={media.id}&size=best"
                            alt="Cannot Load: {media.id}"
                            decoding="async"
                    />
                {/if}

                <div class="absolute top-1 right-1 flex items-center justify-center gap-1 z-20">
                    <IconButton alt="Download" onclick={onDownloadClick}>
                        <DownloadIcon/>
                    </IconButton>
                    {#if type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio}
                        <IconButton variant={asGif ? 'orange' : 'white'} alt="Gif" onclick={onGifClick}>
                            <GifIcon/>
                        </IconButton>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
{/if}