import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';

// The devvit plugin throws outside of `vite build`, and the parent SvelteKit
// project's svelte-check loads this config while looking for svelte configs.
export default defineConfig(({ command }) => ({
  plugins: command === 'build' ? [ devvit() ] : [],
}));
