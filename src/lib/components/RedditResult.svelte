<script lang="ts">
  import { downloadStream } from "$lib/process";
  import { rootDomain, type RedditPost, AllowedRootDomains } from "$lib/reddit";
  import {
    ProgressBar,
    ProgressRadial,
    SlideToggle,
  } from "@skeletonlabs/skeleton";
  import { onMount } from "svelte";

  export let post: RedditPost;

  let processing = false;
  let sharing = false;
  let spoiler = false;

  let dataURL: string = "";
  let dataArr: Uint8Array;
  let extension: string = "";
  let fileName = "";
  $: fileName = `${spoiler ? "SPOILER_" : ""}${
    post.name || post.title
  }.${extension}`;
  $: console.log("reddit post", post);

  onMount(() => {
    const root = rootDomain(post.url);
    const inRootDomain = AllowedRootDomains.includes(root);
    console.log("inRoot?", root, inRootDomain);

    if (post.streams != null) {
      console.log("processing stream");
      processStream();
    } else {
      console.log("processing reddit");
      processGif();
    }
  });

  async function processStream() {
    console.log("processing stream");
    if (post.streams == null) return;

    processing = true;
    dataArr = await downloadStream(post.streams);
    dataURL = URL.createObjectURL(new Blob([dataArr]));
    extension = "mp4";
    processing = false;
  }

  async function processGif() {
    processing = true;
    console.log("processing gif");

    let gif = post.vBaseUrl;
    const domain = rootDomain(post.url);

    // If we are a redgif then lets just allow it
    if (domain.includes("redgif")) {
      console.log("User is submitting a redgif");
      dataURL = `/download?get=${encodeURIComponent(gif)}`;
      extension = "mp4";
    } else {
      // Check if third-party gif actually exists.
      // If not, we will need to default to a variant.
      // == This is for IMGUR
      if (!AllowedRootDomains.includes(domain)) {
        try {
          console.log("validating if the third-party has the image still", {
            domain,
          });
          const response = await fetch(gif, { method: "HEAD" });
          gif = response.ok ? response.url : "";
        } catch (e) {
          console.warn(
            "failed to validate the third-party image:",
            (e as any).message
          );
          gif = "";
        }
      }

      // If we are not hot linked, lets use a variant
      if (!gif.endsWith(".gif")) {
        if (post.variants == null || post.variants.length == 0) {
          gif = post.thumbnail;
        } else if (post.variants[0].gif.length) {
          gif = post.variants[0].gif[0].url;
        } else if (post.variants[0].mp4.length) {
          gif = post.variants[0].mp4[0].url;
        } else if (post.variants[0].image.length) {
          gif = post.variants[0].image[0].url;
        } else {
          gif = post.thumbnail;
        }
      }

      if (gif != null) {
        extension = "gif";
        dataURL = `/download?get=${encodeURIComponent(
          gif
        )}&fileName=${encodeURIComponent(
          `${post.name || post.title}.${extension}`
        )}`;
      }
    }

    console.log(`processing recommends ${extension}:`, dataURL);
    processing = false;
  }

  async function share() {
    let shareData: ShareData;
    console.log("preparing to share...");
    sharing = true;
    try {
      if (extension == "mp4") {
        shareData = {
          title: post.title,
          files: [new File([dataArr], fileName, { type: "video/mp4" })],
        };
      } else {
        const response = await fetch(dataURL);
        const body = await response.arrayBuffer();
        shareData = {
          title: post.title,
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
          title: post.title,
          url: post.permalink,
        });
      }
    } finally {
      sharing = false;
    }
  }
</script>

<div class="card p-4">
  <header class="card-header">{post.title}</header>
  <section class="p-4">
    {#if processing}
      <ProgressRadial
        stroke={100}
        meter="stroke-primary-500"
        track="stroke-primary-500/30"
      />
    {:else if extension == "mp4"}
      <video src={dataURL} autoplay controls muted class:blur-lg={spoiler} />
    {:else}
      <img src={dataURL} alt={post.title} class:blur-lg={spoiler} />
    {/if}
    {fileName}
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
      {#if spoiler || post.nsfw}
        <div class="mt-3">
          <label>Save as Spoiler: </label>
          <SlideToggle name="spoiler_toggle" bind:checked={spoiler} size="sm" />
        </div>
      {/if}
    </footer>
  {/if}
</div>
