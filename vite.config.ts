import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit(),
        SvelteKitPWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Reddit Downloader',
                short_name: 'dl-reddit',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                background_color: '#FF5700',
                theme_color: '#FF5700',
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ],
                share_target: {
                    action: '/share',
                    method: 'GET',
                    params: {
                        title: 'title',
                        text: 'text',
                        url: 'url'
                    }
                }
            }
        }),
    ]
});
