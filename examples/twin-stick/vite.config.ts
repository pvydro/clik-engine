import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'clik-engine': path.resolve(__dirname, '../../packages/clik-engine/src'),
    },
  },
  base: process.env.PAGES ? '/clik-engine/play/twin-stick/' : '/',
  server: { port: 5179 },
});
