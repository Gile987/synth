import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$lib': resolve(__dirname, 'src/lib'),
      '$core': resolve(__dirname, 'src/lib/core'),
      '$modules': resolve(__dirname, 'src/lib/modules'),
      '$components': resolve(__dirname, 'src/lib/components'),
      '$stores': resolve(__dirname, 'src/lib/stores'),
      '$types': resolve(__dirname, 'src/lib/types'),
      '$content': resolve(__dirname, 'src/lib/content'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
