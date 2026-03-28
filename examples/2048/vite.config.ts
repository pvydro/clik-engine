import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'clik-engine': path.resolve(__dirname, '../../packages/clik-engine/src'),
      '@pvydro/clik-engine': path.resolve(__dirname, '../../packages/clik-engine/src'),
    },
  },
  base: process.env.PAGES ? '/clik-engine/play/2048/' : '/',
  server: { port: 5174 },
});
