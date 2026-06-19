<script lang="ts">
  import type { PageData } from "./$types";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Media from "$lib/components/media/Media.svelte";
  import { MediaType } from "$lib/reddit/Media";

  let { data }: { data: PageData } = $props();
  let { share, permalink } = $derived(data);
</script>

<main class="max-w-225 mx-auto sm:p-0 md:p-8">
    <div class="sm:mb-0 md:mb-8">
        <SearchBar forceRounded={false} value={permalink}/>
    </div>
    <article
    >
        {#await share}
            Fetching Post
        {:then { post, collection }}
            <div class="mt-6 flex flex-col flex-wrap justify-center gap-4">
                {#if collection.some(c => c.type === MediaType.SecureVideo)}
                    <Media {post} media={collection.find(c => c.type === MediaType.SecureVideo)!}/>
                {:else if collection.some(c => c.type === MediaType.PreviewVideo)}
                    <Media {post} media={collection.find(c => c.type === MediaType.PreviewVideo)!}/>
                {:else}
                    {#each collection as media}
                        {#if media.type !== MediaType.Thumbnail && media.type !== MediaType.Overridden}
                            <Media {post} {media}/>
                        {/if}
                    {/each}
                {/if}
            </div>
        {/await}
    </article>
</main>
