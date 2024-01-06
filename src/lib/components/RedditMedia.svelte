<script lang="ts">
  import { convertToGif } from "$lib/ffmpeg";
  import { proxy } from "$lib/helpers";
  import { extmime } from "$lib/mime";
  import { Variant, type Media } from "$lib/reddit";
  import { ProgressBar, ProgressRadial } from "@skeletonlabs/skeleton";

  export let media: Media;
  export let blur: boolean = false;
  export let name: string = "";

  let loading = true;

  let gifProgress: number = 0;
  let gif: Promise<Media> | undefined;

  let ext: string = "";
  $: ext = extmime(media.mime);

  let downloadHref = "";
  $: {
    if (media.href && media.href.startsWith("blob")) {
      downloadHref = media.href;
    } else {
      downloadHref = proxy(media.href, `${name}.${ext}`, true);
    }
  }

  /** when a image fails, it will load a proxy */
  function onImageError(evt: Event) {
    const elm = evt.target;
    if (elm == null || !(elm instanceof HTMLImageElement)) return;
    if (elm.src.includes("/api/proxy")) return;

    console.warn("failed to load image, using a proxy instead", elm.src);
    elm.src = proxy(elm.src, elm.getAttribute("data-name") ?? undefined);
  }

  /** converts the MP4 into a gif */
  function convertMP4() {
    if (media.variant != Variant.Video) {
      console.error("cannot possibly convert this media to a gif", media);
      gif = undefined;
      return;
    }

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

      return media;
    })();
  }
</script>

{#await gif}
  {#if gifProgress > 0}
    <ProgressBar max={100} min={0} value={gifProgress * 100} />
  {:else}
    <ProgressBar />
  {/if}
{/await}

<div class="p-4 max-h-[500px] flex justify-center relative">
  {#if loading}
    <svg
      class="animate-pulse snap-center w-20 rounded-container-token object-contain text-gray-200 mb-1 mt-1.5 pt-[40px]"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 640 512"
      ><path
        d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z"
      /></svg
    >
  {/if}
  {#if media.variant === Variant.Video}
    <video
      on:canplay={() => (loading = false)}
      src={media.href}
      autoplay
      controls
      muted
      loop
      class:blur-lg={blur}
    />
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

    <!--
    {#if navigator.share != undefined}
      <button
        on:click={() => alert("sharing not yet implemented")}
        class=" bg-white text-black p-2 rounded hover:bg-gray-100 m-2"
        >Share</button
      >
    {/if}
-->
  </div>
</div>

<!--
    
        <img
          class="snap-center w-[1024px] rounded-container-token"
          src="https://source.unsplash.com/{unsplashId}/1024x768"
          alt={unsplashId}
          loading="lazy"
        />
-->
