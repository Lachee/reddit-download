<script lang="ts">
  import type { Snippet } from "svelte";
  import { Events, getFormat, track } from "$lib/Analytics";
  import { download } from "$lib/reddit/Download";
  import DownloadIcon from "$lib/components/icons/DownloadIcon.svelte"
  import SpinnerIcon from "$lib/components/icons/SpinnerIcon.svelte"

  let {
        href,
        ondownload,
        children,
      }: {
    href: string,
    ondownload?: (evt: { href: string }) => void,
    children?: Snippet,
  } = $props();


  let downloading = $state(false);

  async function onDownloadClick(event: MouseEvent) {
    downloading = true;
    try {
      event.preventDefault();
      const format = getFormat(href);
      track(Events.Download, { format });
      download(href);
      ondownload && ondownload({ href });
      setTimeout(() => downloading = false, 1000);
    } catch (e) {
      console.error(e);
      downloading = false;
      throw e;
    }
  }
</script>

<a class="font-bold py-2 px-4 rounded-lg cursor-pointer bg-orange-600 hover:bg-orange-700 text-white flex gap-1 not-sm:grow "
   download
   href={href}
   onclick={(event) => onDownloadClick(event)}>
  {#if downloading}
    <SpinnerIcon/>
  {:else}
    <DownloadIcon/>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</a>