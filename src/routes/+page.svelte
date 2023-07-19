<script lang="ts">
  import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
  import { fetchPost } from "$lib/vreddit";

  let redditPostURL = "";
  let downloadLink = "";
  let downloadStage = "";
  let isVideo = false;

  async function createObjectURLFromGif(
    gif: string,
    retry = true
  ): Promise<string> {
    try {
      const blob = await fetch(gif).then((res) => res.blob());
      return URL.createObjectURL(blob);
    } catch (e) {
      if (retry) {
        console.warn("Failed to download gif directly, proxying: ", e);
        return await createObjectURLFromGif(
          "/download?gif=" + encodeURIComponent(gif),
          false
        );
      } else {
        console.error("Failed to download gif: ", e);
        throw e;
      }
    }
  }

  function trimParameters(url: string): string {
    const indexOfParam = url.indexOf("?");
    if (indexOfParam > 0) return url.slice(0, indexOfParam - 1);
    return url;
  }

  async function downloadSecureMedia() {
    try {
      downloadStage = "Extracting Reddit Video";
      redditPostURL = trimParameters(redditPostURL);

      const post = await fetchPost(redditPostURL);
      console.log("Reddit Post", post);

      if (post.streams == null) {
        if (post.variants != null) {
          const gifURL = post.url.endsWith(".gif")
            ? post.url
            : post.variants[0].gif[0].url;

          downloadStage = "Downloading Gif...";
          try {
            // Try to fetch it from reddit and ourselves (via proxy)
            isVideo = false;
            downloadLink = await createObjectURLFromGif(gifURL, true);
            downloadStage = "Done. Gifs only.";
          } catch (e) {
            // We failed, lets just log it
            isVideo = false;
            downloadLink = gifURL;
            //@ts-ignore
            downloadStage = "Done. Failed to embed gif: " + e.message;
          }
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
        fetchFile(audio.url).then((f) =>
          ffmpeg.FS("writeFile", "audio.mp4", f)
        ),
        fetchFile(video.url).then((f) =>
          ffmpeg.FS("writeFile", "video.mp4", f)
        ),
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
    } catch (e) {
      console.error("failed to convert", e);
      //@ts-ignore
      downloadStage = "An error has occured: " + e.message;
    }
  }
</script>

<h1>Welcome to SvelteKit</h1>
<input
  type="text"
  placeholder="https://reddit.com/r/..../"
  bind:value={redditPostURL}
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
