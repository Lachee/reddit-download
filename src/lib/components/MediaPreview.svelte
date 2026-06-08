<script lang="ts">
    import type {Post} from "$lib/reddit/schema/postSchema";
    import {type Media, VariantType, sort} from "$lib/reddit/Media";
    import DownloadIcon from "$lib/components/icons/DownloadIcon.svelte"
    import GifIcon from "$lib/components/icons/GifIcon.svelte"
    import IconButton from "$lib/components/IconButton.svelte";
    import LoadingBubble from "$lib/components/LoadingBubble.svelte";

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

    let mediaElement: HTMLImageElement | HTMLVideoElement  | undefined = $state();

    /** The first variant with a defined dimension, used as baseline for sizing. */
    const baselineDimensionalVariant = $derived(media.variants.filter(m => m.dimension).sort((a, b) => b.dimension!.height - a.dimension!.height)[0]);

    let width = $derived(baselineDimensionalVariant?.dimension?.width ?? 480);
    let height = $derived(baselineDimensionalVariant?.dimension?.height ?? width / (16 / 9));

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
            ? `/g/${post.permalink.substring(3)}?media=${media.id}`
            : (
                type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio
                    ? `/v/${post.permalink.substring(3)}?media=${media.id}`
                    : `/i/${post.permalink.substring(3)}?media=${media.id}`
            )
        download(url);
    }

    function onGifClick() {
        // const url = `/g/${post.permalink.substring(3)}?media=${media.id}`;
        // download(url);
        asGif = !asGif;
    }

</script>


<div
        class="rounded-lg overflow-hidden relative h-full m-auto max-w-full"
        style="max-height: {Math.min(height, 800)}px;  aspect-ratio: {width} / {height};"
>
    <LoadingBubble mediaElement={mediaElement} width={width} height={height} />
    <div class="w-full h-full">
        {#if type === VariantType.GIF || asGif }
            <img bind:this={mediaElement} class="w-full h-auto" src="/g/{post.permalink.substring(3)}?media={media.id}"
                 alt="Cannot Load: {media.id}" />
        {:else if type === VariantType.Video || type === VariantType.PartialVideo || type === VariantType.PartialAudio}
            <video bind:this={mediaElement}
                   class="w-full h-full"
                   controls={true}
                   autoplay={isGifVideo}
                   muted={isGifVideo}
                   loop={isGifVideo}
                   playsinline
                   src="/v/{post.permalink.substring(3)}?media={media.id}"
                   >
            </video>
        {:else}
            <img bind:this={mediaElement} class="w-full h-auto" src="/i/{post.permalink.substring(3)}?media={media.id}"
                 alt="Cannot Load: {media.id}" />
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
