<script lang="ts">
  let {
    host,
    website,
  }: {
    host: string;
    website: string;
  } = $props();

  const scriptTag = $derived(
    `<script defer src="${host}/script.js" data-website-id="${website}"><\/script>`,
  );
</script>

<svelte:head>
  {@html scriptTag}
</svelte:head>
