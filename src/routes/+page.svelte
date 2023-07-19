<script lang="ts">
  import { goto } from "$app/navigation";
  import Post from "$lib/components/Post.svelte";
  import { fetchPost, type RedditPost } from "$lib/reddit";

  import { ProgressBar } from "@skeletonlabs/skeleton";

  let searchBox: string = "";
  let postPromise: Promise<RedditPost>;

  function search() {
    postPromise = fetchPost(searchBox).then((post) => {
      searchBox = post.url;
      return post;
    });
  }
</script>

<div class="container mx-auto p-8 space-y-8">
  <h1 class="h1">Reddit Downloader</h1>
  <p>Download Reddit videos & gifs without the ads!</p>
  <section>
    <div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
      <div class="input-group-shim">https://</div>
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
  {#await postPromise}
    <ProgressBar />
  {:then post}
    {#if post != null}
      <Post {post} />
    {/if}
  {/await}
</div>
