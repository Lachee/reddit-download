<script lang="ts">
  import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
  import { videos } from "$lib/vreddit";
  let downloadLink = "";
  let downloadStage = "";

  async function fetchVideos() {}

  async function downloadSecureMedia() {
    downloadStage = "Extracting Reddit Video";
    const url =
      "https://www.reddit.com/r/Unity3D/comments/1537msz/ama_i_made_a_prototype_with_my_friend_got_a/";
    const vreddit = await videos(url);

    downloadStage = "Initializing FFMPEG";
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();

    downloadStage = "Downloading VReddit Sources";
    const audio = vreddit.streams.audio;
    const video = Object.values(vreddit.streams.video).filter(
      (v) => v.maxFormat
    )[0];

    await Promise.all([
      fetchFile(audio.url).then((f) => ffmpeg.FS("writeFile", "audio.mp4", f)),
      fetchFile(video.url).then((f) => ffmpeg.FS("writeFile", "video.mp4", f)),
    ]);

    downloadStage = "Running FFMPEG";
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

    downloadStage = "Extracting FFMPEG Result";
    const data = await ffmpeg.FS("readFile", "output.mp4");
    downloadLink = URL.createObjectURL(new Blob([data]));

    downloadStage = "Done!";

    // Termine ffmpeg
    ffmpeg.exit();
  }
</script>

<h1>Welcome to SvelteKit</h1>
<button on:click={() => downloadSecureMedia()}>Download Reddit Video</button>

<p>Status: {downloadStage}</p>

{#if downloadLink != ""}
  <a href={downloadLink} target="_blank">Download File</a>
  <video src={downloadLink} controls autoplay muted />
{/if}
