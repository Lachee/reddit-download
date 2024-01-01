<script lang="ts">
  import { onMount } from "svelte";
  import { firstBy } from "thenby";
  import { ProgressBar } from "@skeletonlabs/skeleton";
  import { downloadStream } from "$lib/process";
  import { type Post, type Media, Variant } from "$lib/reddit2";
  import RedditMedia from "./RedditMedia.svelte";

  let elemCarousel: HTMLDivElement;
  const unsplashIds = [
    "vjUokUWbFOs",
    "1aJuPtQJX_I",
    "Jp6O3FFRdEI",
    "I3C_eojFVQY",
    "s0fXOuyTH1M",
    "z_X0PxmBuIQ",
  ];

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

  type BestMedia = Media & { thumbnail?: Media };

  let media: Promise<BestMedia[]> = new Promise<BestMedia[]>(() => {});
  onMount(() => {
    media = findBestMedia();
  });

  async function findBestMedia(): Promise<BestMedia[]> {
    const best: BestMedia[] = [];
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

      let thumbnail = collection.find((m) => m.variant == Variant.Thumbnail);
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
          <img
            class="rounded-container-token h-32 aspect-square overflow-hidden object-cover"
            src={media.thumbnail?.href}
            alt="thumbnail"
            loading="lazy"
          />
        </button>
      {/each}
    </div>

    <!-- Full Images -->
    <div
      bind:this={elemCarousel}
      class="snap-x snap-mandatory scroll-smooth flex gap-4 overflow-x-auto"
    >
      {#each collection as media}
        <div class="snap-start shrink-0 card w-[100%] text-center">
          <RedditMedia {media} />
        </div>
      {/each}
    </div>
  {:else}
    <div class="card p-4">
      <RedditMedia media={collection[0]} />
    </div>
  {/if}
{/await}
