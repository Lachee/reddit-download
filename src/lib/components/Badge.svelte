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
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
  };

  let themeClass = $derived(themes[theme]);
</script>

<p class="inline-block mr-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider {themeClass}">
    {@render children()}
</p>