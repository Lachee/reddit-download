<script lang="ts">
  import { downloadStream } from "$lib/process";
  import type { RedditPost } from "$lib/reddit";
  import { ProgressRadial } from "@skeletonlabs/skeleton";
  import { onMount } from "svelte";

  export let post: RedditPost;

  let processing = false;
  let dataURL: string = "";
  let extension: string = "";

  $: console.log("reddit post", post);

  onMount(() => {
    if (post.streams != null) {
      processStream();
    } else {
      processGif();
    }
  });

  async function processStream() {
    if (post.streams == null) return;

    processing = true;
    const data = await downloadStream(post.streams);
    dataURL = URL.createObjectURL(new Blob([data]));
    extension = "mp4";
    processing = false;
  }

  async function processGif() {
    processing = true;

    let gif = post.vBaseUrl;
    if (!gif.endsWith(".gif")) {
      if (post.variants == null) gif = post.thumbnail;
      else gif = post.variants[0].gif[0].url;
    }

    if (gif != null) {
      dataURL = "/download?get=" + encodeURIComponent(gif);
      extension = "gif";
    }
    processing = false;
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
      <video src={dataURL} autoplay controls muted />
    {:else}
      <img src={dataURL} alt={post.title} />
    {/if}
  </section>

  {#if !processing}
    <footer class="card-footer">
      <a
        href={dataURL}
        download={`${post.name || post.title}.${extension}`}
        class="btn variant-filled">Download</a
      >
    </footer>
  {/if}
</div>
