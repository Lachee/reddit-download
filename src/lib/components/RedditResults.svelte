<script lang="ts">
  import type { Post, Media } from "$lib/reddit2";
  import { ProgressBar } from "@skeletonlabs/skeleton";
  import { onMount } from "svelte";

  export let post: Post;

  let media: Promise<Media[]>;

  onMount(() => {
    media = processPostMedia();
  });

  function processPostMedia(): Promise<Media[]> {
    return new Promise<Media[]>((r, f) => {});
  }
</script>

<h3>{post.title}</h3>

{#await media}
  <ProgressBar />
{/await}
