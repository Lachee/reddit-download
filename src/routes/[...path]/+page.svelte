<script lang="ts">
  // # Svelte
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import type { PageData } from "./$types";

  // # Library
  import {
    type Post as RedditPost,
    getMedia as fetchRedditPost,
  } from "$lib/reddit";
  import { fetchProxy as fetchRedGif, type Gif as RedGif } from "$lib/redgifs";
  import { rootHostname } from "$lib/helpers";

  // # Components
  import { ProgressBar } from "@skeletonlabs/skeleton";
  import Footer from "$lib/components/Footer.svelte";
  import RedGifResults from "$lib/components/RedGifResults.svelte";
  import RedditResults from "$lib/components/RedditResults.svelte";
  import Searchbox from "$lib/components/Searchbox.svelte";

  export let data: PageData;

  type Result = {
    reddit?: RedditPost;
    redgif?: RedGif;
  };

  let searchBox: string =
    $page.url.searchParams.get("share") || data.postUrl || "";

  let resultPromise: Promise<Result>;

  onMount(() => {
    if (searchBox != "") search();
  });

  function search() {
    const domain = rootHostname(searchBox);
    if (domain.includes("reddit")) {
      console.log("searching reddit", searchBox);
      resultPromise = fetchRedditPost(searchBox).then((reddit) => {
        searchBox = reddit.permalink.toString();
        return { reddit };
      });
    }

    if (domain.includes("redgif")) {
      console.log("searching redgif", searchBox);
      resultPromise = fetchRedGif(searchBox).then((redgif) => {
        return { redgif };
      });
    }
  }
</script>

<div class="container mx-auto p-8 space-y-8">
  <h1 class="h1">Reddit Downloader</h1>
  <p>Download Reddit videos & gifs without the ads!</p>
  <Searchbox
    bind:value={searchBox}
    placeholder="reddit.com/r/..."
    on:click={() => search()}
  />

  {#await resultPromise}
    <ProgressBar />
  {:then result}
    {#if result?.reddit !== undefined}
      <RedditResults post={result.reddit} />
    {:else if result?.redgif !== undefined}
      <RedGifResults gif={result.redgif} />
    {:else}
      <p>
        Your browser will download and process the videos / gifs. They will
        appear here ready for sharing or saving to file.<br />
        <strong>"RapidSave" is garbage</strong>, don't use that adware, use this
        instead.
      </p>
    {/if}
  {/await}

  <div class="block card card-hover p-4">
    <header class="card-header">
      <span class="h3">Hotlink Directly Here!</span>
    </header>
    <section class="p-4">
      Add the <strong>DL-</strong> prefix to the <strong>reddit.com</strong>
      to download the video quickly and easily!<br />
      {#await resultPromise}
        <code>https://www.dl-reddit.com/r/...</code>
      {:then result}
        {#if result?.reddit !== undefined}
          <code>https://dl-reddit.com{result?.reddit.permalink.pathname}</code>
        {:else}
          <code>https://www.dl-reddit.com/r/...</code>
        {/if}
      {/await}
    </section>
  </div>
  <Footer />
</div>
