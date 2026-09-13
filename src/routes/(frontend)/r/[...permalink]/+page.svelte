<script lang="ts">
  import type { PageData } from "./$types";
  import { getOpenGraphProperties } from "$lib/reddit/OpenGraph";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import OpenGraph from "$lib/components/OpenGraph.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Media from "$lib/components/media/Media.svelte";
  import DownloadIcon from "$lib/components/icons/DownloadIcon.svelte";
  import SpinnerIcon from "$lib/components/icons/SpinnerIcon.svelte";
  import { MediaType } from "$lib/reddit/Media";
  import { getDownloadLink, getExtension } from "$lib/reddit/Download";
  import { normalizePermalink } from "$lib/reddit/Utilities";

  let { data }: { data: PageData } = $props();
  let { post, type, collection } = $derived(data);

  let permalink = $derived(normalizePermalink(post.permalink).substring(2));

  /** The media actually presented on the page. Videos take over the entire post. */
  let presented = $derived.by(() => {
    const video = collection.find(c => c.type === MediaType.SecureVideo)
                  ?? collection.find(c => c.type === MediaType.PreviewVideo);
    if (video)
      return [ video ];

    return collection.filter(c => c.type !== MediaType.Thumbnail && c.type !== MediaType.Overridden);
  });

  let supportsFileSystem = $state(false);
  let saving = $state(false);

  $effect(() => {
    supportsFileSystem = 'showDirectoryPicker' in window;
  });

  async function onSaveAllClick() {
    const directory = await window.showDirectoryPicker({ mode: 'readwrite' }).catch(() => null);
    if (!directory)
      return;

    saving = true;
    try {
      const padding = String(presented.length).length;
      for (const [ index, media ] of presented.entries()) {
        const response = await fetch(getDownloadLink(permalink, media));
        if (!response.ok || !response.body)
          continue;

        const prefix = String(index + 1).padStart(padding, '0');
        const filename = `${post.id}-${prefix}-${media.id}.${getExtension(response)}`;
        const file = await directory.getFileHandle(filename, { create: true });
        await response.body.pipeTo(await file.createWritable());

        // Try to enforce date ordering for sites like discord
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    } finally {
      saving = false;
    }
  }
</script>

<OpenGraph properties={getOpenGraphProperties(post, collection)}/>

<main class="max-w-225 mx-auto sm:p-0 md:p-8">
    <div class="sm:mb-0 md:mb-8">
        <SearchBar value={post.permalink} forceRounded={false}/>
    </div>
    <article
            class="md:border-2 border-b-2 border-gray-200 md:rounded-2xl p-8 bg-white dark:bg-cliff-800 dark:border-cliff-950 dark:text-gray-300"
    >
        <header class="border-b-2 border-gray-200 pb-4 dark:border-cliff-400">
            <div class="flex flex-wrap gap-2 text-gray-500 text-sm">
                <span>{post.subredditName ?? `r/${post.subreddit}`}</span>
                <span>•</span>
                <span>u/{post.author}</span>
                <span>•</span>
                <span>
                        <a
                                href={`https://www.reddit.com/${post.permalink}`}
                                target="_blank"
                                rel="noreferrer"
                                class="hover:underline "
                        >
                            view in reddit
                        </a>
                    </span>
            </div>

            <h1 class="text-2xl font-bold my-3 leading-tight">{post.title}</h1>

            <div class="flex flex-wrap my-3 gap-2 items-center">
                <div class="flex flex-wrap gap-2 text-gray-500 text-sm">
                    <Badge theme="orange">{type}</Badge>
                    {#if post.over_18}
                        <Badge theme="purple">NSFW</Badge>
                    {/if}
                    {#if post.spoiler}
                        <Badge theme="gray">Spoiler</Badge>
                    {/if}
                </div>

                {#if presented.length > 1}
                    <button
                    class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 ml-auto not-sm:grow
                    disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!supportsFileSystem || saving}
                    onclick={onSaveAllClick}
                    >
                        {#if saving}
                            <SpinnerIcon/>
                        {:else}
                            <DownloadIcon/>
                        {/if}
                        {saving ? 'Saving' : 'Save All'}
                    </button>
                {/if}
            </div>
        </header>

        <div class="mt-6 flex flex-col flex-wrap justify-center gap-4">
            {#each presented as media}
                <Media {post} {media}/>
            {/each}
        </div>
    </article>
</main>
