<script lang="ts">
  import { Variant, type Media } from "$lib/reddit2";

  export let media: Media;
  export let blur: boolean = false;
  export let fileName: string = "";

  let title = "";
  $: {
    title = `${media.href} (${media.variant})`;
    if (media.dimension && media.dimension.height)
      title = `${title} (${media.dimension.width}x${media.dimension.height})`;
  }

  let downloadHref = "";
  $: {
    downloadHref = media.href.startsWith("blob")
      ? media.href
      : `/api/proxy?href=${encodeURIComponent(
          media.href
        )}&fileName=${encodeURIComponent(fileName)}`;
  }

  function onImageError(evt: Event) {
    const elm = evt.target;
    if (elm == null || !(elm instanceof HTMLImageElement)) return;
    if (elm.src.includes("/api/proxy")) return;
    console.log("updating src", elm.src);
    elm.src = `/api/proxy?href=${encodeURIComponent(elm.src)}`;
  }
</script>

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
    {#if fileName != ""}
      <a
        href={downloadHref}
        download={fileName}
        class=" text-white p-2 rounded bg-blue-700 hover:bg-blue-800 m-2 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >Download</a
      >
    {/if}
    {#if navigator.share != undefined}
      <button
        on:click={() => alert("sharing not yet implemented")}
        class=" bg-white text-black p-2 rounded hover:bg-gray-100 m-2"
        >Share</button
      >
    {/if}
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
