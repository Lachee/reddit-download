<script lang="ts">
  import type { Post } from "$lib/reddit/schema/postSchema";
  import { type Media, type Variant, VariantType } from "$lib/reddit/Media";
  import DownloadIcon from "$lib/components/icons/DownloadIcon.svelte"
  import GifIcon from "$lib/components/icons/GifIcon.svelte"
  import IconButton from "$lib/components/IconButton.svelte";
  import LoadingMediaElement from "$lib/components/loaders/LoadingMediaElement.svelte";

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

  let loading = $state(false);
  let asGif = $state(false);
  let type = $derived(variant.type);

  /** The first variant with a defined dimension, used as baseline for sizing. */
  let baselineDimensionalVariant = $derived(media.variants.filter(m => m.dimension).sort((a, b) => b.dimension!.height - a.dimension!.height)[0]);
  let width = $derived(baselineDimensionalVariant?.dimension?.width ?? 480);
  let height = $derived(baselineDimensionalVariant?.dimension?.height ?? width / (16 / 9));

  $effect(() => {
    void post;
    asGif = false;
  })

  $effect(() => {
    void post;
    void asGif;
    loading = true;
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
    asGif = !asGif;
  }

</script>

<div
        class="rounded-lg overflow-hidden relative h-full m-auto max-w-full"
        style="max-height: {Math.min(height, 800)}px;  aspect-ratio: {width} / {height};"
>
    <LoadingMediaElement
            height={height}
            loading={loading}
            thumbnail="/i/{permalink}?media={media.id}&size=thumbnail"
            variant="pixels"
            width={width}
    />

    <div class="w-full h-full">
        {#if type === VariantType.GIF || asGif }
            <img
                    class="w-full h-auto"
                    src="/g/{permalink}?media={media.id}&size=best"
                    alt="Cannot Load: {media.id}"
                    decoding="async"
                    onload={() => loading = false}
                    onerror={() => loading = false}
            />
        {:else if type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio}
            <video
                   class="w-full h-full"
                   controls={true}
                   autoplay={isGifVideo}
                   muted={isGifVideo}
                   loop={isGifVideo}
                   playsinline
                   src="/v/{permalink}?media={media.id}&size=best"
                   oncanplay={() => loading = false}
                   onloadeddata={() => loading = false}
                   onerror={() => loading = false}
            >
            </video>
        {:else}
            <img
                    class="w-full h-auto"
                    src="/i/{permalink}?media={media.id}&size=best"
                    alt="Cannot Load: {media.id}"
                    decoding="async"
                    onload={() => loading = false}
                    onerror={() => loading = false}
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