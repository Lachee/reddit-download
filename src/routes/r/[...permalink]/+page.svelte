<script lang="ts">
  import type { PageData } from "./$types";
  import { getOpenGraphProperties } from "$lib/reddit/OpenGraph";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import OpenGraph from "$lib/components/OpenGraph.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import MediaPreview from "$lib/components/MediaPreview.svelte";
  import { MediaType } from "$lib/reddit/server/Media";

  let { data }: { data: PageData } = $props();
  let { post, type, collection } = $derived(data);
</script>

<OpenGraph properties={getOpenGraphProperties(post)}/>

<main class="max-w-225 mx-auto sm:p-0 md:p-8">
    <div class="sm:mb-0 md:mb-8">
        <SearchBar value={post.permalink} forceRounded={false}/>
    </div>
    <article
            class="md:border-2 border-b-2 border-gray-200 md:rounded-2xl p-8 bg-white"
    >
        <header>
            <div class="flex flex-wrap gap-2 text-gray-500 text-sm">
                <span>{post.subredditName ?? `r/${post.subreddit}`}</span>
                <span>•</span>
                <span>u/{post.author}</span>
            </div>

            <h1 class="text-2xl font-bold my-3 leading-tight">{post.title}</h1>

            <div class="flex flex-wrap my-3 gap-2 text-gray-500 text-sm">
                <Badge theme="orange">{type}</Badge>
                {#if post.over_18}
                    <Badge theme="purple">NSFW</Badge>
                {/if}
                {#if post.spoiler}
                    <Badge theme="gray">Spoiler</Badge>
                {/if}
                {#if post.is_gallery}
                    <Badge theme="green">Gallery</Badge>
                {/if}
            </div>

            <div class="flex flex-wrap gap-2 text-gray-500 text-sm">
                <span>{post.score ?? 0} points</span>
                <span>{post.comments ?? post.num_comments ?? 0} comments</span>

                {#if post.createdAt}
                    <span>{post.createdAt.toLocaleString()}</span>
                {:else if post.created_utc}
                    <span
                    >{new Date(
                      post.created_utc * 1000,
                    ).toLocaleString()}</span
                    >
                {/if}
            </div>
        </header>

        {#if post.body}
            <div class="mt-6 whitespace-pre-wrap leading-relaxed">
                {post.body}
            </div>
        {:else if post.selftext}
            <div class="mt-6 whitespace-pre-wrap leading-relaxed">
                {post.selftext}
            </div>
        {/if}

        <div class="mt-6 flex flex-col">
            {#if collection.some(c => c.type == MediaType.SecureVideo)}
                <MediaPreview {post} media={collection.find(c => c.type == MediaType.SecureVideo)!}/>
            {:else if collection.some(c => c.type == MediaType.PreviewVideo)}
                <MediaPreview {post} media={collection.find(c => c.type == MediaType.PreviewVideo)!}/>
            {:else}
                {#each collection as media}
                    {#if media.type != MediaType.Thumbnail && media.type != MediaType.Overridden}
                        <MediaPreview {post} {media}/>
                    {/if}
                {/each}
            {/if}
        </div>

        {#if post.url && !post.isSelf && !post.is_self}
            <p>
                <a
                        href={post.url}
                        target="_blank"
                        rel="noreferrer"
                        class="text-orange-600 hover:underline font-medium"
                >
                    Open linked content
                </a>
            </p>
        {/if}

        {#if post.permalink}
            <p>
                <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        class="text-orange-600 hover:underline font-medium"
                >
                    Open on Reddit
                </a>
            </p>
        {/if}
    </article>
</main>
