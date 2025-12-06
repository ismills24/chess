import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    postcss: './postcss.config.cjs',
  },
  server: {
    watch: {
      ignored: ['**/assets/maps/**'],
    },
  },
});
