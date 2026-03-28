import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'clik-engine',
    },
    rollupOptions: {
      external: ['phaser'],
    },
  },
  plugins: [dts({ rollupTypes: true })],
});
