---
name: clik-build
description: Build, optimize, and create release bundles for clik-engine games
---

## What I do

- Run `vite build` with production configuration
- Check bundle size and flag oversized assets
- Validate the production build boots correctly
- Optimize asset loading tiers in the manifest
- Generate standalone release bundles (port hand-offs)

## When to use me

Use `/clik-build` when:
- You want to create a production build
- You want to check bundle size
- You want to prepare a release or deployment
- You want to optimize the build

---

## Build Process

### Step 1: Run production build
```bash
npm run build
```
This runs `vite build` which produces a `dist/` folder with:
- `index.html` — Entry point
- `assets/*.js` — Bundled game + engine + Phaser
- `assets/*` — Static assets (images, audio)

### Step 2: Check bundle size
```bash
ls -lh dist/assets/*.js
```
Target sizes:
- Game code: < 100KB (before gzip)
- Phaser: ~1.2MB (before gzip, ~350KB gzipped)
- Total: < 1.5MB ungzipped

### Step 3: Validate the build
```bash
npx vite preview --port 4173
```
Then use Preview tools to verify the production build works.

### Step 4: Asset optimization
Review the `AssetManifest`:
- `boot` tier: Only critical assets needed for loading screen (< 50KB total)
- `main` tier: Core gameplay assets
- `deferred` tier: Non-critical assets loaded lazily

### Optimization Checklist

- [ ] Images compressed (use tinypng or similar)
- [ ] Audio in OGG + MP3 formats for cross-browser support
- [ ] Sprite atlases used instead of individual images
- [ ] No unused assets in manifest
- [ ] `boot` tier is minimal
- [ ] Tree-shaking: only import what you need from clik-engine

### Port Hand-Off

The `dist/` folder is a fully self-contained static site. To create a port hand-off:

1. Run `npm run build`
2. The `dist/` folder can be deployed to any static host
3. No runtime dependency on the engine dev environment
4. Works on: Vercel, Netlify, GitHub Pages, S3, any web server

For mobile:
- Wrap the `dist/` folder with Capacitor or Cordova
- The game is already responsive and handles touch input
