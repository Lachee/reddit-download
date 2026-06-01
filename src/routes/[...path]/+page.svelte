<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>


<main class="page">
    {#await data.post}
        <section class="card">
            <p>Loading Reddit post...</p>
        </section>
    {:then redditPost}
        {@const post = redditPost.post}
        <article class="card">
            <header>
                <div class="meta">
                    <span>{post.subredditName ?? `r/${post.subreddit}`}</span>
                    <span>•</span>
                    <span>u/{post.author}</span>
                </div>

                <h1>{post.title}</h1>

                <div class="stats">
                    <span>{post.score ?? 0} points</span>
                    <span>{post.comments ?? post.num_comments ?? 0} comments</span>

                    {#if post.createdAt}
                        <span>{post.createdAt.toLocaleString()}</span>
                    {:else if post.created_utc}
                        <span>{new Date(post.created_utc * 1000).toLocaleString()}</span>
                    {/if}
                </div>
            </header>

            {#if post.body}
                <div class="body">
                    {post.body}
                </div>
            {:else if post.selftext}
                <div class="body">
                    {post.selftext}
                </div>
            {/if}

            {#if post.url && !post.isSelf && !post.is_self}
                <p>
                    <a href={post.url} target="_blank" rel="noreferrer">
                        Open linked content
                    </a>
                </p>
            {/if}

            {#if post.permalink}
                <p>
                    <a href={post.permalink} target="_blank" rel="noreferrer">
                        Open on Reddit
                    </a>
                </p>
            {/if}

            {#if post.isNsfw || post.over_18}
                <p class="tag">NSFW</p>
            {/if}

            {#if post.isSpoiler || post.spoiler}
                <p class="tag">Spoiler</p>
            {/if}
        </article>
    {:catch error}
        <section class="card error">
            <h1>Failed to load Reddit post</h1>
            <pre>{error instanceof Error ? error.message : String(error)}</pre>
        </section>
    {/await}
</main>

<style>
    .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
    }

    .card {
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 1.5rem;
        background: white;
    }

    .meta,
    .stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        color: #666;
        font-size: 0.9rem;
    }

    h1 {
        margin: 0.75rem 0;
        line-height: 1.2;
    }

    .body {
        margin-top: 1.5rem;
        white-space: pre-wrap;
        line-height: 1.5;
    }

    a {
        color: #0066cc;
    }

    .tag {
        display: inline-block;
        margin-right: 0.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: 999px;
        background: #eee;
        font-size: 0.8rem;
        font-weight: bold;
    }

    .error {
        border-color: #d33;
    }

    pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
</style>