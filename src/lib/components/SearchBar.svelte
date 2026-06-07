<script lang="ts">
  import { goto } from "$app/navigation";
  import { navigating } from "$app/state";
  import { normalizePermalink } from "$lib/reddit/Utilities";

  let {
        value        = "",
        forceRounded = true,
      }: { value?: string; forceRounded?: boolean } = $props();
  let url = $state(value);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!url) return;

    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    // Try to normalize the permalink from the URL
    const permalink = normalizePermalink(trimmedUrl);
    goto(`/${permalink}`, { invalidateAll: true });
  }
</script>

<form class="relative w-full max-w-225 mx-auto group" onsubmit={handleSubmit}>
    <input
            bind:value={url}
            class="w-full px-6 py-4 text-lg border-2 bg-white dark:bg-cliff-900  border-gray-200 dark:border-cliff-800  focus:border-orange-500 focus:ring-4 not-dark:focus:ring-orange-300  dark:focus:ring-orange-900 transition-all outline-none pr-32 md:rounded-2xl dark:text-white"
            class:sm:rounded-2xl={forceRounded}
            placeholder="https://www.reddit.com/r/subreddit/comments/..."
            required
            type="text"
    />
    <button
            class="absolute right-2 top-2 bottom-2 px-6 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center min-w-[80px] cursor-pointer"
            disabled={navigating.to !== null}
            type="submit"
    >
        {#if navigating.to !== null}
            <svg
                    class="text-orange-700 animate-spin"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
            >
                <path
                        d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
                        stroke="currentColor"
                        stroke-width="5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                ></path>
                <path
                        d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
                        stroke="currentColor"
                        stroke-width="5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="text-white"
                >
                </path>
            </svg>
        {:else}
            Go
        {/if}
    </button>
</form>
