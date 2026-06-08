<script lang="ts">
  import { page } from '$app/state';
  import SearchBar from "$lib/components/SearchBar.svelte";

  let message = $state('');
  let title = $state('');


  $effect(() => {
    if (page.error) {
      switch (page.status) {
        case 404:
          message = 'The post could not be found.';
          title = '404 | Not Found';
          break;
        case 403:
          message = 'This post is inaccessible to you at the moment. ';
          title = '403 | Forbidden';
          break;
        default:
          message = 'An unknown error has occured. ' + page.error.message;
          title = page.status + ' | Unknown Error'
          break;
      }

      const parts = page.error.message.split(':', 2);
      if (parts.length > 1) {
        switch (parts[0].trim()) {
          default:
            break;
          case 'NOT_FOUND':
            message = 'The post could not be found.';
            title = '404 | Not Found';
            break;
          case 'DENY_NSFW':
            message = 'The post is NSFW and NSFW posts are not allowed.';
            title = '403 | Banned: NSFW';
            break;
          case 'DENY_SUBREDDIT':
            message = 'The post is in a subreddit that is not allowed.'
            title = '403 | Banned: Bad Subreddit';
            break;
        }
      }
    }
  })

</script>

{#if page.error}
    <main class="max-w-225 mx-auto sm:p-0 md:p-8">
        <div class="sm:mb-0 md:mb-8">
            <SearchBar value={page.url.href} forceRounded={false}/>
        </div>
        <article class=" dark:text-gray-300">
            <div class="flex min-h-40 flex-col rounded-2xl border border-stone-300 bg-stone-100/89 hover:bg-stone-200 dark:border-cliff-700 dark:bg-cliff-900/80 p-6 transition dark:hover:bg-cliff-800">
                <h3 class="text-lg font-bold text-gray-900 dark:text-cliff-100">
                    {title}
                </h3>

                <p class="mt-3 flex-1 text-sm text-cliff-300">
                    {message}
                </p>

                <p class="mt-3 flex-1 text-sm text-cliff-300">
                    The error has occured while trying to process this reddit post. This error has been cached and won't
                    work.<br/> Please try a different post.
                </p>
            </div>
        </article>
    </main>
{:else}
    <div class="dark:text-white">
        Something has gone seriously wrong. The error page does not have an error?
        <p class="mt-3"><a href="/" class="text-blue-500 hover:underline">Return to Home</a></p>
    </div>
{/if}