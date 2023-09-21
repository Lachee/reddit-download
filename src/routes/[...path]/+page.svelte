<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import RedditResult from "$lib/components/RedditResult.svelte";

  import {
    fetchPost as fetchRedditPost,
    rootDomain,
    type RedditPost,
  } from "$lib/reddit";

  import { ProgressBar } from "@skeletonlabs/skeleton";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import {
    fetchProxy as fetchRedGif,
    redgif,
    type Gif as RedGif,
  } from "$lib/redgifs";
  import RedGifResults from "$lib/components/RedGifResults.svelte";

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
      <p>Just paste your reddit link above and hit go!</p>
      <p>
        Your browser will download and process the videos / gifs. They will
        appear here ready for sharing or saving to file.
      </p>
      <p>
        <strong>"RapidSave" is garbage</strong>, don't use that adware, use this
        instead.
      </p>
    {/if}
  {/await}
</div>
