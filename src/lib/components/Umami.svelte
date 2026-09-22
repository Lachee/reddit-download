<script lang="ts">
  let {
    host,
    website,
    replays = false,
    heatmap = false,
    performance = false,
  }: {
    host: string;
    website: string;
    replays?: boolean;
    heatmap?: boolean;
    performance?: boolean;
  } = $props();

  const scriptTag = $derived(
    `<script defer src="${host}/script.js" data-website-id="${website}" data-performance="${performance ? 'true' : 'false'}"><\/script>`,
  );

  const recorderTag = $derived(
    replays || heatmap ? `<script defer src="${host}/recorder.js" data-website-id="${website}"><\/script>` : '',
  )
</script>

<svelte:head>
  {@html scriptTag}
  {@html recorderTag}
</svelte:head>
