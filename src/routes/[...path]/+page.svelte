<script lang="ts">
  // # Svelte
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import type { PageData } from "./$types";

  // # Library
  import {
    type Post as RedditPost,
    getMedia as getRedditPost,
    Domains as RedditDomains,
  } from "$lib/reddit";
  import type { Gif as RedgifPost } from "$lib/redgifs";
  import { validateUrl } from "$lib/helpers";

  // # Components
  import { ProgressBar } from "@skeletonlabs/skeleton";
  import Footer from "$lib/components/Footer.svelte";
  import RedGifResults from "$lib/components/RedGifResults.svelte";
  import RedditResults from "$lib/components/RedditResults.svelte";
  import Searchbox from "$lib/components/Searchbox.svelte";

  export let data: PageData;

  interface Result {
    reddit?: RedditPost;
    redgif?: RedgifPost;
  }

  let result: Result = data;
  let searching: boolean = false;
  const hasResult = () => result.reddit || result.redgif;

  let searchBox: string =
    $page.url.searchParams.get("share") || data.source || "";

  onMount(() => {
    // We have the searchBox prefilled but no reddit data, we need to perform the search ourselves
    console.log("page mount", data);
    if (!hasResult() && searchBox != "") search();
  });

  /** Performs a search based on the searchBox content */
  async function search(): Promise<Result> {
    console.log("performing search...");
    searching = true;
    try {
      // Search Reddit
      if (validateUrl(searchBox, RedditDomains)) {
        console.log("searching reddit", searchBox);
        result.reddit = await getRedditPost(searchBox);
        searchBox = result.reddit.permalink.toString();
        return result;
      }

      // No idea what we are searching for :shrug:
      console.warn("unknown destination, not sure what we are looking for");
      return (result = data);
    } finally {
      searching = false;
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
    on:clear={() => (result = {})}
  />

  {#if searching}
    <ProgressBar />
  {:else if result.reddit !== undefined}
    <RedditResults post={result.reddit} />
  {:else if result.redgif !== undefined}
    <RedGifResults gif={result.redgif} />
  {:else}
    <p>
      Your browser will download and process the videos / gifs. They will appear
      here ready for sharing or saving to file.<br />
      <strong>"RapidSave" is garbage</strong>, don't use that adware, use this
      instead.
    </p>
  {/if}

  <div class="block card card-hover p-4">
    <header class="card-header">
      <span class="h3">Hotlink Directly Here!</span>
    </header>
    <section class="p-4">
      Add the <strong>DL-</strong> prefix to the <strong>reddit.com</strong>
      to download the video quickly and easily!<br />
      {#if !hasResult()}
        <code>https://www.dl-reddit.com/r/...</code>
      {:else if result.reddit !== undefined}
        <code
          >https://dl-reddit.com/{new URL(result?.reddit.permalink)
            .pathname}</code
        >
      {:else}
        <code>https://www.dl-reddit.com/r/...</code>
      {/if}
    </section>
  </div>
  <Footer />
</div>
