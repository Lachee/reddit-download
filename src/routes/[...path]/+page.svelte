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

  let searchBox: string =
    $page.url.searchParams.get("share") || data.source || "";

  let result: Promise<Result> = Promise.resolve(data);

  onMount(() => {
    // We have the searchBox prefilled but no reddit data, we need to perform the search ourselves
    if (!data.reddit && searchBox != "") search();
  });

  /** Performs a search based on the searchBox content */
  async function search(): Promise<Result> {
    // Search Reddit
    if (validateUrl(searchBox, RedditDomains)) {
      console.log("searching reddit", searchBox);
      result = getRedditPost(searchBox).then((reddit) => {
        searchBox = reddit.permalink.toString();
        return { reddit };
      });
    }

    // No idea what we are searching for :shrug:
    console.warn("unknown destination, not sure what we are looking for");
    result = Promise.resolve(data);
    return data;
  }
</script>

<div class="container mx-auto p-8 space-y-8">
  <h1 class="h1">Reddit Downloader</h1>
  <p>Download Reddit videos & gifs without the ads!</p>
  <Searchbox
    bind:value={searchBox}
    placeholder="reddit.com/r/..."
    on:click={() => search()}
    on:clear={() => (result = Promise.resolve({}))}
  />

  {#await result}
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
      {#await result}
        <code>https://www.dl-reddit.com/r/...</code>
      {:then result}
        {#if result?.reddit !== undefined}
          <code
            >https://dl-reddit.com/{new URL(result?.reddit.permalink)
              .pathname}</code
          >
        {:else}
          <code>https://www.dl-reddit.com/r/...</code>
        {/if}
      {/await}
    </section>
  </div>
  <Footer />
</div>
