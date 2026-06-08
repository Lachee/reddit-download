<script lang="ts" module>
  export type OGPProperty = { name: `og:${string}` | `twitter:${string}`, content: string };
</script>

<script lang="ts">
  let { properties }: { properties: OGPProperty[] } = $props();
</script>

<svelte:head>
    {#each properties as property}
        <meta property={property.name} content={property.content}/>
    {/each}
</svelte:head>
