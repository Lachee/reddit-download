<script lang="ts">
  import { convertToGif } from "$lib/ffmpeg";
  import { extmime } from "$lib/mime";
  import { Variant, type Media } from "$lib/reddit";
  import { ProgressBar, ProgressRadial } from "@skeletonlabs/skeleton";

  export let media: Media;
  export let blur: boolean = false;
  export let name: string = "";

  let gif: Promise<Media> | undefined;

  let ext: string = "";
  $: ext = extmime(media.mime);

  let downloadHref = "";
  $: {
    if (media.href && media.href.startsWith("blob")) {
      downloadHref = media.href;
    } else {
      downloadHref = `/api/proxy?href=${encodeURIComponent(
        media.href
      )}&fileName=${encodeURIComponent(name + "." + ext)}`;
    }
  }

  function onImageError(evt: Event) {
    const elm = evt.target;
    if (elm == null || !(elm instanceof HTMLImageElement)) return;
    if (elm.src.includes("/api/proxy")) return;
    console.log("updating src", elm.src);
    elm.src = `/api/proxy?href=${encodeURIComponent(elm.src)}`;
  }

  function convertMP4() {
    if (media.variant != Variant.Video) {
      console.error("cannot possibly convert this media to a gif", media);
      gif = undefined;
      return;
    }

    gif = (async () => {
      const oldBlobRef = media.href;
      const data = await convertToGif(oldBlobRef);
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
  <ProgressBar />
{/await}

<div class="p-4 max-h-[500px] flex justify-center relative">
  {#if media.variant === Variant.Video}
    <video src={media.href} autoplay controls muted loop class:blur-lg={blur} />
  {:else}
    <img
      src={media.href}
      on:error={onImageError}
      alt=""
      class:blur-lg={blur}
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
