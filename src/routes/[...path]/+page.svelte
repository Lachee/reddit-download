<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import RedditResult from "$lib/components/RedditResult.svelte";

  import { fetchPost as fetchRedditPost, type RedditPost } from "$lib/reddit";
  import { getPost as fetchImprovedPost } from "$lib/reddit2";

  import { ProgressBar } from "@skeletonlabs/skeleton";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import {
    fetchProxy as fetchRedGif,
    redgif,
    type Gif as RedGif,
  } from "$lib/redgifs";
  import RedGifResults from "$lib/components/RedGifResults.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { rootDomain } from "$lib/helpers";

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
    const domain = rootDomain(searchBox);
    if (domain.includes("reddit")) {
      console.log("searching reddit post");
      fetchImprovedPost(searchBox);

      return;
      resultPromise = fetchRedditPost(searchBox).then((reddit) => {
        searchBox = reddit.permalink;
        return { reddit };
      });
    } else if (domain.includes("redgif")) {
      console.log("searching redgif");
      resultPromise = fetchRedGif(searchBox).then((redgif) => {
        return { redgif };
      });
    }
  }
</script>

<div class="container mx-auto p-8 space-y-8">
  <h1 class="h1">Reddit Downloader</h1>
  <p>Download Reddit videos & gifs without the ads!</p>
  <section>
    <div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
      <div class="input-group-shim">🔗</div>
      <input
        type="search"
        placeholder="reddit.com/r/..."
        bind:value={searchBox}
      />
      <button class="variant-filled-secondary" on:click={() => search()}
        >Go</button
      >
    </div>
  </section>

  {#await resultPromise}
    <ProgressBar />
  {:then result}
    {#if result?.reddit !== undefined}
      <RedditResult post={result.reddit} />
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
          <code
            >{result?.reddit.permalink.replace(
              "reddit.com",
              "dl-reddit.com"
            )}</code
          >
        {:else}
          <code>https://www.dl-reddit.com/r/...</code>
        {/if}
      {/await}
    </section>
  </div>
  <Footer />
</div>
