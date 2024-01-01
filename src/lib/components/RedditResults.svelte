<script lang="ts">
  import { onMount } from "svelte";
  import { firstBy } from "thenby";
  import { ProgressBar } from "@skeletonlabs/skeleton";
  import { downloadStream } from "$lib/process";
  import { type Post, type Media, Variant } from "$lib/reddit2";

  const VariantOrder = [
    Variant.PartialVideo,
    Variant.PartialAudio,
    Variant.Video,
    Variant.GIF,
    Variant.Image,
    Variant.Thumbnail,
    Variant.Blur,
  ];

  export let post: Post;
  let spoiler = false;

  let media: Promise<Media[]> = new Promise<Media[]>(() => {});
  onMount(() => {
    media = findBestMedia();
  });

  async function findBestMedia(): Promise<Media[]> {
    const best: Media[] = [];
    for (const collection of post.media) {
      // Sort the collection by the variant type and then the dimensions
      collection.sort(
        firstBy(
          (a: Media, b: Media) =>
            VariantOrder.indexOf(a.variant) - VariantOrder.indexOf(b.variant)
        ).thenBy(
          (a, b) => (a.dimension?.width ?? 0) - (b.dimension?.width ?? 0),
          -1
        )
      );

      // If we have video only and audio source, we need to process them.
      if (collection[0].variant === Variant.PartialVideo) {
        // Fetch and validate the audio
        const video = collection[0];
        const audio = collection.find(
          (media) => media.variant === Variant.PartialAudio
        );

        // We have an audio component so we need to combine them.
        if (audio) {
          const videoData = await downloadStream({
            video: video.href,
            audio: audio?.href,
          });

          // Push the new media
          best.push({
            mime: "video/mp4",
            variant: Variant.Video,
            dimension: video.dimension,
            href: URL.createObjectURL(new Blob([videoData])),
          });
          continue;
        }
      }

      best.push(collection[0]);
    }

    console.log("best content", best);
    return best;
  }

  function onImageError(evt: Event) {
    console.log("error", evt);
  }
</script>

<h3>{post.title}</h3>

{#await media}
  <ProgressBar />
{:then collection}
  {#each collection as media}
    {#if media.variant === Variant.Video}
      <video
        src={media.href}
        autoplay
        controls
        muted
        loop
        class:blur-lg={spoiler}
      />
    {:else}
      <img
        src={`/api/proxy?href=${encodeURIComponent(media.href)}`}
        on:error={onImageError}
        alt={post.title}
        class:blur-lg={spoiler}
      /><br />
    {/if}
  {/each}
{/await}
