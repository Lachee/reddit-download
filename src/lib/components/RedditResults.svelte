<script lang="ts">
  import { onMount } from "svelte";
  import { ProgressBar } from "@skeletonlabs/skeleton";
  import { combine } from "$lib/ffmpeg";
  import {
    type Post,
    type Media,
    Variant,
    sortMedia,
    getOGPMetadata,
  } from "$lib/reddit";
  import RedditMedia from "./RedditMedia.svelte";
  import { proxy, createOpenGraph } from "$lib/helpers";
  import { extmime } from "$lib/mime";
  import Sparkle from "./Sparkle.svelte";

  let elemCarousel: HTMLDivElement;

  export let post: Post;
  let spoiler = false;

  type ProcessedMedia = Media & {
    thumbnail?: Media;
    audio?: Media;
  };

  let media: Promise<ProcessedMedia[]> = new Promise<ProcessedMedia[]>(
    () => {}
  );
  onMount(() => {
    media = findBestMedia();
  });

  async function findBestMedia(): Promise<ProcessedMedia[]> {
    const best: ProcessedMedia[] = [];
    for (const collection of sortMedia(post)) {
      // Find the worse thumbnail possible
      const thumbnail = collection.findLast(
        (media) => media.variant === Variant.Thumbnail
      );

      // If we have video only and audio source, we need to process them.
      if (collection[0].variant === Variant.PartialVideo) {
        const video = collection[0];
        const audio = collection.find(
          (media) => media.variant === Variant.PartialAudio
        );

        best.push({
          mime: "video/mp4",
          variant: Variant.PartialVideo,
          dimension: video.dimension,
          href: video.href,
          audio,
          thumbnail,
        });
      } else {
        best.push({ ...collection[0], thumbnail });
      }
    }

    console.log(">> Best Variants ", best);
    return best;
  }

  function jumpCarousel(index: number) {
    const child = elemCarousel.children.item(index) as HTMLElement;
    if (child == null) return;
    child.scrollIntoView({ block: "nearest", inline: "center" });
  }
</script>

<svelte:head>
  {@html createOpenGraph(getOGPMetadata(post))}
</svelte:head>

<h3>{post.title}</h3>

{#await media}
  <ProgressBar />
{:then collection}
  {#if collection.length > 1}
    <div class="card p-4 grid grid-cols-6 gap-4">
      {#each collection as media, i}
        <button on:click={() => jumpCarousel(i)}>
          {#if media.thumbnail}
            <img
              class="rounded-container-token h-32 w-[100%] aspect-square overflow-hidden object-cover object-top"
              src={proxy(
                media.thumbnail.href,
                `${post.id}_${i}_thumbnail.${extmime(media.thumbnail.mime)}`
              )}
              alt="{post.id}_{i}_thumbnail.{extmime(media.thumbnail.mime)}"
              data-mime={media.thumbnail.mime}
            />
          {:else}
            Img No. {i}
          {/if}
        </button>
      {/each}
    </div>

    <!-- Full Images -->
    <div
      bind:this={elemCarousel}
      class="snap-x snap-mandatory scroll-smooth flex gap-4 overflow-x-auto"
    >
      {#each collection as media, i}
        <div class="snap-start shrink-0 card w-[100%] text-center">
          <RedditMedia
            {media}
            thumbnail={media.thumbnail}
            audio={media.audio}
            name="{post.id}_{i}"
          />
        </div>
      {/each}
    </div>
  {:else}
    <div class="card p-4">
      <RedditMedia
        media={collection[0]}
        thumbnail={collection[0].thumbnail}
        audio={collection[0].audio}
        name={post.id}
      />
    </div>
  {/if}
{/await}
