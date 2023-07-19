<script lang="ts">
  import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
  import { fetchPost } from "$lib/vreddit";

  let redditPost = "";
  let downloadLink = "";
  let downloadStage = "";
  let isVideo = false;

  async function fetchVideos() {}

  async function downloadSecureMedia() {
    downloadStage = "Extracting Reddit Video";
    const post = await fetchPost(redditPost);
    console.log("Reddit Post", post);
    if (post.streams == null) {
      if (post.variants != null) {
        downloadStage = "Downloading Gif...";
        const blob = await fetch(post.variants[0].gif[0].url).then((res) =>
          res.blob()
        );

        isVideo = false;
        downloadLink = URL.createObjectURL(blob);
        downloadStage = "Done. Gifs only.";
      } else {
        downloadStage = "Done. No media.";
      }
      return;
    }

    downloadStage = "Initializing FFMPEG...";
    const ffmpeg = createFFmpeg({ log: false });
    await ffmpeg.load();

    downloadStage = "Downloading MP4 Streams...";
    const audio = post.streams.audio;
    const video = Object.values(post.streams.video).filter(
      (v) => v.maxFormat
    )[0];

    await Promise.all([
      fetchFile(audio.url).then((f) => ffmpeg.FS("writeFile", "audio.mp4", f)),
      fetchFile(video.url).then((f) => ffmpeg.FS("writeFile", "video.mp4", f)),
    ]);

    downloadStage = "Combining Audio & Video streams...";
    await ffmpeg.run(
      "-i",
      "video.mp4",
      "-i",
      "audio.mp4",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "output.mp4"
    );

    downloadStage = "Creating MP4 from results...";
    const data = await ffmpeg.FS("readFile", "output.mp4");

    isVideo = true;
    downloadLink = URL.createObjectURL(new Blob([data]));
    downloadStage = "Done!";

    // Termine ffmpeg
    ffmpeg.exit();
  }
</script>

<h1>Welcome to SvelteKit</h1>
<input
  type="text"
  placeholder="https://reddit.com/r/..../"
  bind:value={redditPost}
/>
<button on:click={() => downloadSecureMedia()}>Download Reddit Video</button>
<p>Status: {downloadStage}</p>

{#if downloadLink != ""}
  <p><a href={downloadLink} target="_blank">Download File</a></p>
  {#if isVideo}
    <video src={downloadLink} controls autoplay muted />
  {:else}
    <img src={downloadLink} alt="reddit-post" />
  {/if}
{/if}
