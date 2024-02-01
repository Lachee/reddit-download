<script lang="ts">
  import Device from "svelte-device-info";
  import { combine, convertToGif } from "$lib/ffmpeg";
  import { proxy } from "$lib/helpers";
  import { extmime } from "$lib/mime";
  import { Variant, type Media } from "$lib/reddit";
  import { ProgressBar } from "@skeletonlabs/skeleton";
  import Sparkle from "./Sparkle.svelte";
  import { browser } from "$app/environment";

  import logger from "$lib/log";
  const { log, warn, error } = logger("MEDIA");

  export let name: string;
  export let media: Media;
  export let thumbnail: Media | undefined = undefined;
  export let audio: Media | undefined = undefined;
  export let blur: boolean = false;

  let loading = true;

  /** Conversion process of a gif */
  let gifProgress: number = 0;
  let gif: Promise<Media> | undefined;
  let partialProgress: number = 0;
  let partial: Promise<Media> | undefined;

  /** Extension of the file */
  let ext: string = "";
  $: ext = extmime(media.mime);

  /** Hotlink to download the image*/
  let downloadHref = "";
  $: {
    if (media.href && media.href.startsWith("blob")) {
      downloadHref = media.href;
    } else {
      downloadHref = proxy(media.href, `${name}.${ext}`, true);
    }
  }

  $: if (media.variant === Variant.PartialVideo) convertPartialVideo();

  function convertPartialVideo() {
    log("converting partial video...");
    if (!browser) {
      error("cannot convert partial video in ssr");
      partial = undefined;
      return;
    }

    partialProgress = 0;
    partial = (async () => {
      const data = await combine(
        media.href,
        audio?.href,
        (progress) => (partialProgress = progress)
      );
      media.mime = "video/mp4";
      media.variant = Variant.Video;
      media.href = URL.createObjectURL(new Blob([data]));
      media = media; // (trigger a layout)
      loading = true;

      log("partial finished generating");
      return media;
    })();
  }

  /** when a image fails, it will load a proxy */
  function onImageError(evt: Event) {
    const elm = evt.target;
    if (elm == null || !(elm instanceof HTMLImageElement)) return;
    if (elm.src.includes("/api/proxy")) return;

    warn("failed to load image, using a proxy instead", elm.src);
    elm.src = proxy(elm.src, elm.getAttribute("data-name") ?? undefined);
  }

  /** converts the MP4 into a gif */
  function convertMP4() {
    log("converting MP4...");
    if (!browser) {
      error("cannot convert to gif in ssr");
      gif = undefined;
      return;
    }

    if (media.variant != Variant.Video) {
      error("cannot possibly convert this media to a gif", media);
      gif = undefined;
      return;
    }

    // Enable this to make sparkes on the gifs
    // loading = true;
    // thumbnail = media;

    gifProgress = 0;
    gif = (async () => {
      const oldBlobRef = media.href;
      const data = await convertToGif(
        oldBlobRef,
        (progress) => (gifProgress = progress)
      );
      media.mime = "image/gif";
      media.variant = Variant.GIF;
      media.href = URL.createObjectURL(new Blob([data]));
      media = media; // (trigger a layout)

      // Cleanup the old unused blob.
      if (oldBlobRef.startsWith("blob")) URL.revokeObjectURL(oldBlobRef);

      log("gif finished generating");
      return media;
    })();
  }
</script>

<div class="p-4 max-h-[500px] flex justify-center relative">
  {#if loading}
    {#if thumbnail}
      <div class="flex flex-col items-center justify-start">
        <Sparkle
          src={proxy(thumbnail.href)}
          width={thumbnail.dimension?.width ?? 0}
          height={thumbnail.dimension?.height ?? 0}
          displayWidth={media.dimension?.width}
          displayHeight={media.dimension?.height}
          count={Device.isMobile ? 150 : 350}
          velocity={0}
          radius={thumbnail.variant == Variant.Thumbnail ? 2 : 20}
          blur={thumbnail.variant == Variant.Thumbnail ? 1 : 10}
        />
      </div>
    {:else}
      <svg
        class="animate-pulse snap-center w-20 rounded-container-token object-contain text-gray-200 mb-1 mt-1.5 pt-[40px]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        fill="currentColor"
        viewBox="0 0 640 512"
        ><path
          d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z"
        /></svg
      >{/if}
  {/if}
  {#if media.variant !== Variant.PartialVideo}
    {#if media.variant === Variant.Video}
      <div class="flex justify-center flex-col">
        <video
          on:canplay={() => (loading = false)}
          src={media.href}
          autoplay
          controls
          muted
          loop
          class:blur-lg={blur}
          class:hidden={loading}
          class="h-[100%]"
        />

        {#await gif}
          {#if gifProgress > 0}
            <ProgressBar
              rounded="none"
              max={100}
              min={0}
              value={gifProgress * 100}
            />
          {:else}
            <ProgressBar rounded="none" />
          {/if}
        {/await}
      </div>
    {:else}
      <img
        src={media.href}
        on:error={onImageError}
        on:load={() => (loading = false)}
        alt=""
        data-name={name + "." + ext}
        class:blur-lg={blur}
        class:hidden={loading}
        class="snap-center w-[1024px] rounded-container-token object-contain"
        loading="lazy"
      /><br />
    {/if}

    <!-- Download Button -->
    <div class="flex absolute top-0">
      {#if name != ""}
        <a
          href={downloadHref}
          download={name + "." + ext}
          class=" text-white p-2 rounded bg-blue-700 hover:bg-blue-800 m-2 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >Download</a
        >
      {/if}

      {#if media.variant == Variant.Video}
        {#if gif === undefined}
          <button
            on:click={() => convertMP4()}
            class=" bg-purple-700 text-white p-2 rounded hover:bg-purple-900 m-2"
            >Convert to Gif</button
          >
        {/if}
      {/if}
    </div>
  {:else}
    <div class="flex absolute top-0 w-[200px]">
      <ProgressBar
        rounded="none"
        max={100}
        min={0}
        value={partialProgress * 100}
      />
    </div>
  {/if}
</div>

<!--
    
        <img
          class="snap-center w-[1024px] rounded-container-token"
          src="https://source.unsplash.com/{unsplashId}/1024x768"
          alt={unsplashId}
          loading="lazy"
        />
-->
