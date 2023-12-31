<script lang="ts">
  import { convertToGif } from "$lib/gif";
  import { extname, proxyDownload, rootDomain } from "$lib/helpers";
  import { downloadStream } from "$lib/process";
  import { type RedditPost, RedditDomains } from "$lib/reddit";
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

  let videoURL: string = "";
  let videoData: ArrayBuffer | null;
  let gifPromise: Promise<Uint8Array> | null = null;
  let gifDataUrl: string = "";

  /** the URL used to embed the content, either the data b64 encoded or a url to the data */
  let dataURL: string = "";
  /** file type of the media */
  let extension: string = "";
  /** cache copy of the media */
  let dataArr: Uint8Array;

  /** prefered filename of the media */
  let fileName = "";
  $: fileName = `${spoiler ? "SPOILER_" : ""}${
    post.name || post.title
  }.${extension}`;
  $: console.log("reddit post: ", post);

  onMount(() => {
    processing = true;
    if (post.streams != null) {
      fetchStreamURL().then(() => (processing = false));
    } else {
      fetchGifURL().then(() => (processing = false));
    }
  });

  async function fetchStreamURL() {
    if (post.streams == null) return;

    console.log("Fetching the stream data...", post.streams);
    dataArr = await downloadStream(post.streams);
    dataURL = URL.createObjectURL(new Blob([dataArr]));
    extension = "mp4";
  }

  async function fetchGifURL() {
    const name = post.name || post.title;
    console.log("Fetching the image data...", name);

    // == RedGifs should just go straight the proxy
    const domain = rootDomain(post.url);
    if (domain.includes("redgif")) {
      console.log("User is submitting a redgif");
      extension = "mp4";
      dataURL = proxyDownload(post.vBaseUrl, `${name}.${extension}`);
      return;
    }

    // == Third-Party gifs are manually searched and checked.
    if (!RedditDomains.includes(domain)) {
      try {
        console.log(
          "validating if the third-party has the image still: ",
          domain
        );
        const response = await fetch(post.url, { method: "HEAD" });
        if (response.ok) {
          extension = extname(dataURL);
          dataURL = proxyDownload(response.url, `${name}.${extension}`);
          return;
        } else {
          // FIXME: We will have to brute force the content
          //        There is the /page but it is currently broken as it needs a login
        }
      } catch (e: any) {
        console.warn("failed to validate the third-party image:", e.message);
      }
    }

    // == We are not a hotlinked gif, lets find a variant
    if (!post.vBaseUrl.endsWith(".gif")) {
      let url = post.thumbnail || post.vBaseUrl;
      let ext = extname(url);

      if (post.variants != null && post.variants.length == 0) {
        if (post.variants[0].gif.length) {
          url = post.variants[0].gif[0].url;
          ext = "gif";
        } else if (post.variants[0].mp4.length) {
          url = post.variants[0].mp4[0].url;
          ext = "mp4";
        } else if (post.variants[0].image.length) {
          url = post.variants[0].image[0].url;
          ext = extname(url);
        }
      } else if (post.thumbnail == null || post.thumbnail == "default") {
        // Variants are null, we have no thumbnail, likely no other information...
        // We will brute force this damn url!
      }

      extension = ext || extname(url) || "gif";
      dataURL = proxyDownload(url, `${name}.${extension}`);
      console.log(
        "-  Found data from one of the variants",
        extension,
        url,
        dataURL
      );
    } else {
      extension = extname(post.vBaseUrl);
      dataURL = proxyDownload(post.vBaseUrl, `${name}.${extension}`);

      console.log(
        "-  Found data from one of the variants",
        extension,
        post.vBaseUrl,
        dataURL
      );
    }
  }

  async function convertMP4() {
    gifPromise = (async () => {
      if (videoData == null) {
        console.log("downloading video data...");
        videoData = await (await fetch(dataURL)).arrayBuffer();
      }

      const result = await convertToGif(new Uint8Array(videoData));
      dataURL = URL.createObjectURL(new Blob([result]));
      extension = "gif";
      console.log("finished conversion", result, gifDataUrl);
      return result;
    })();
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

      {#if gifPromise == null && extension == "mp4"}
        <button on:click={() => convertMP4()} class="btn variant-filled-surface"
          >Convert to Gif</button
        >
      {:else if gifPromise != null}
        {#await gifPromise}
          converting...
        {:then}
          done
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
      {#if spoiler || post.nsfw}
        <div class="mt-3">
          <label>Save as Spoiler: </label>
          <SlideToggle name="spoiler_toggle" bind:checked={spoiler} size="sm" />
        </div>
      {/if}
    </footer>
  {/if}
</div>
