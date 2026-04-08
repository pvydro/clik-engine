import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'clik-engine': path.resolve(__dirname, '../packages/clik-engine/src'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        multi: path.resolve(__dirname, 'multi.html'),
      },
    },
  },
});
