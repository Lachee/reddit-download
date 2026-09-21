<script lang="ts">
  import type { ComponentEmbed } from "$lib/reddit/Discord";
  let { component }: { component: ComponentEmbed } = $props();
  const json = $derived(JSON.stringify(component));
  const scriptTag = $derived(`<script id="discord:component-embed" type="application/json">${json}<\/script>`);
</script>

<svelte:head>
  {@html scriptTag}
</svelte:head>
