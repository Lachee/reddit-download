<script lang="ts">
  import type { Snippet } from 'svelte';

  type Theme =
    | 'orange'
    | 'blue'
    | 'green'
    | 'red'
    | 'purple'
    | 'gray';

  type Props = {
    children: Snippet;
    theme?: Theme;
  };

  let {
        children,
        theme = 'orange'
      }: Props = $props();

  const themes: Record<Theme, string> = {
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    gray: 'bg-gray-100 text-gray-700'
  };

  let themeClass = $derived(themes[theme]);
</script>

<p class="inline-block mr-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider {themeClass}">
    {@render children()}
</p>