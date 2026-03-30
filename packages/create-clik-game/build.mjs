import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/index.js',
  banner: { js: '#!/usr/bin/env node' },
});

console.log('Built dist/index.js');
