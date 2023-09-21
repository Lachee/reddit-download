<script lang="ts">
  import { downloadStream } from "$lib/process";
  import type { Gif } from "$lib/redgifs";
  import {
    ProgressBar,
    ProgressRadial,
    SlideToggle,
  } from "@skeletonlabs/skeleton";
  import { onMount } from "svelte";

  export let gif: Gif;

  let processing = false;
  let sharing = false;
  let spoiler = true;

  let dataURL: string = "";
  let dataArr: Uint8Array;
  let extension: string = "";
  let fileName = "";
  $: fileName = `${spoiler ? "SPOILER_" : ""}${gif.id}.${extension}`;
  $: console.log("redgif", gif);

  onMount(() => {
    console.log("processing reddit");
    processGif();
  });

  async function processGif() {
    processing = true;
    dataURL = "/download?get=" + encodeURIComponent(gif.permalink);
    extension = "mp4";
    processing = false;
  }

  async function share() {
    let shareData: ShareData;
    console.log("preparing to share...");
    sharing = true;
    try {
      if (extension == "mp4") {
        shareData = {
          title: gif.id,
          files: [new File([dataArr], fileName, { type: "video/mp4" })],
        };
      } else {
        const response = await fetch(dataURL);
        const body = await response.arrayBuffer();
        shareData = {
          title: gif.id,
          files: [
            new File([body], fileName, {
              type: response.headers.get("content-type") || "image/gif",
            }),
          ],
        };
      }

      if (navigator.canShare(shareData)) {
        console.log("can share", shareData);
        await navigator.share(shareData);
      } else {
        console.log("cannot share data. trying something simpler", shareData);
        await navigator.share({
          title: gif.id,
          url: gif.permalink,
        });
      }
    } finally {
      sharing = false;
    }
  }
</script>

<div class="card p-4">
  <header class="card-header">
    <h1>{gif.id}</h1>
    <h2>
      {gif.description}
    </h2>
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
        src={dataURL}
        autoplay
        controls
        muted
        class:blur-lg={spoiler}
        class="max-h-96"
      />
    {:else}
      <img
        src={dataURL}
        alt={gif.id}
        class:blur-lg={spoiler}
        class="max-h-96"
      />
    {/if}
  </section>

  {#if !processing}
    <footer class="card-footer">
      <a href={dataURL} download={fileName} class="btn variant-filled">Save</a>

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
