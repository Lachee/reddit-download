<script lang="ts">
  import { onMount } from "svelte";
  import { firstBy } from "thenby";
  import { ProgressBar } from "@skeletonlabs/skeleton";
  import { combine } from "$lib/ffmpeg";
  import { type Post, type Media, Variant } from "$lib/reddit";
  import RedditMedia from "./RedditMedia.svelte";
  import { proxy } from "$lib/helpers";
  import { extmime } from "$lib/mime";

  let elemCarousel: HTMLDivElement;

  export let post: Post;
  let spoiler = false;

  type BestMedia = Media & { thumbnail?: Media };

  let media: Promise<BestMedia[]> = new Promise<BestMedia[]>(() => {});
  onMount(() => {
    media = findBestMedia();
  });

  async function findBestMedia(): Promise<BestMedia[]> {
    const best: BestMedia[] = [];
    for (const collection of post.media) {
      // If we have video only and audio source, we need to process them.
      if (collection[0].variant === Variant.PartialVideo) {
        // Fetch and validate the audio
        const video = collection[0];
        const audio = collection.find(
          (media) => media.variant === Variant.PartialAudio
        );

        // We have an audio component so we need to combine them.
        const videoData = await combine(video.href, audio?.href);

        // Push the new media
        best.push({
          mime: "video/mp4",
          variant: Variant.Video,
          dimension: video.dimension,
          href: URL.createObjectURL(new Blob([videoData])),
        });
        continue;
      }

      let thumbnail = collection.findLast(
        (m) => m.variant == Variant.Thumbnail
      );
      best.push({ ...collection[0], thumbnail });
    }

    console.log("best content", best);
    return best;
  }

  function jumpCarousel(index: number) {
    const child = elemCarousel.children.item(index) as HTMLElement;
    if (child == null) return;
    child.scrollIntoView({ block: "nearest", inline: "center" });
  }
</script>

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
          <RedditMedia {media} name="{post.id}_{i}" />
        </div>
      {/each}
    </div>
  {:else}
    <div class="card p-4">
      <RedditMedia media={collection[0]} name={post.id} />
    </div>
  {/if}
{/await}
