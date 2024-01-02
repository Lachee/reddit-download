<script lang="ts">
  import { deserialize } from "$app/forms";
  import { bufferToDataURL, convertToGif } from "$lib/gif";
  import type { Gif } from "$lib/redgifs";
  import {
    ProgressBar,
    ProgressRadial,
    SlideToggle,
  } from "@skeletonlabs/skeleton";
  import { onMount } from "svelte";

  export let gif: Gif;
  let videoPlayer: HTMLVideoElement;

  let processing = false;
  let sharing = false;
  let spoiler = false;

  let videoURL: string = "";
  let videoData: ArrayBuffer | null;
  let gifPromise: Promise<Uint8Array> | null = null;
  let gifDataUrl: string = "";

  let extension: string = "";
  let fileName = "";
  $: fileName = `${spoiler ? "SPOILER_" : ""}${gif.id}.${extension}`;
  $: console.log("redgif", gif);

  onMount(() => {
    console.log("processing reddit");
    processing = true;
    videoURL = "/download?get=" + encodeURIComponent(gif.permalink);
    extension = "mp4";
    videoData = null;
    processing = false;
  });

  async function share() {
    let shareData: ShareData;
    console.log("preparing to share...");
    sharing = true;
    await navigator.share({
      title: gif.id,
      url: gif.permalink,
    });
  }

  async function convertMP4() {
    gifPromise = (async () => {
      if (videoData == null) {
        console.log("downloading video data...");
        videoData = await (await fetch(videoURL)).arrayBuffer();
      }

      const result = await convertToGif(new Uint8Array(videoData));
      gifDataUrl = URL.createObjectURL(new Blob([result]));
      console.log("finished conversion", result, gifDataUrl);
      return result;
    })();
  }
</script>

<div class="card p-4">
  <header class="card-header">
    <h1>{gif.id}</h1>
    {#if gif.description != null}
      <h2>
        {gif.description}
      </h2>
    {/if}
  </header>

  <section class="p-4">
    {#if processing}
      <ProgressRadial
        stroke={100}
        meter="stroke-primary-500"
        track="stroke-primary-500/30"
      />
    {:else if extension == "mp4"}
      <video
        bind:this={videoPlayer}
        src={videoURL}
        autoplay
        controls
        muted
        class:blur-lg={spoiler}
        class="max-h-96"
      />
    {:else}
      <img
        src={videoURL}
        alt={gif.id}
        class:blur-lg={spoiler}
        class="max-h-96"
      />
    {/if}
    {#if gifPromise != null}
      {#await gifPromise}
        <ProgressBar />
      {:then gifData}
        <img src={gifDataUrl} alt="Video Gif" />
      {/await}
    {/if}
    {fileName}
  </section>

  {#if !processing}
    <footer class="card-footer">
      <a href={videoURL} download={fileName} class="btn variant-filled"
        >Save Video</a
      >

      {#if gifPromise == null}
        <button on:click={() => convertMP4()} class="btn variant-filled-surface"
          >Convert to Gif</button
        >
      {:else}
        {#await gifPromise then}
          <a
            href={gifDataUrl}
            download={fileName + ".gif"}
            class="btn variant-filled-surface">Save Gif</a
          >
        {/await}
      {/if}

      {#if navigator.share != undefined}
        {#if !sharing}
          <button on:click={() => share()} class="btn variant-ghost"
            >Share
          </button>
        {:else}
          <button disabled class="btn variant-ringed">Share</button>
          <div class="mt-2">
            <ProgressBar />
          </div>
        {/if}
      {/if}
      {#if spoiler}
        <div class="mt-3">
          <label>Save as Spoiler: </label>
          <SlideToggle name="spoiler_toggle" bind:checked={spoiler} size="sm" />
        </div>
      {/if}
    </footer>
  {/if}
</div>
