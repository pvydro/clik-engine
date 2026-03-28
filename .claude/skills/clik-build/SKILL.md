---
name: clik-build
description: Build, optimize, test, and create release bundles for clik-engine games
---

## What I do

- Run `vite build` with production configuration
- Run unit tests to verify nothing is broken
- Check bundle size and flag oversized assets
- Validate the production build boots correctly
- Optimize asset loading tiers in the manifest
- Generate standalone release bundles (port hand-offs)
- Set up Capacitor for mobile deployment

## When to use me

Use `/clik-build` when:
- You want to create a production build
- You want to check bundle size
- You want to prepare a release or deployment
- You want to optimize the build
- You want to set up mobile builds

---

## Build Process

### Step 1: Run tests
```bash
npm run test
```
All 136+ tests must pass before building.

### Step 2: Run production build
```bash
npm run build
```
Produces `dist/` with:
- `index.html` — Entry point
- `assets/*.js` — Bundled game + engine + Phaser (~166KB engine + ~1.2MB Phaser)
- `assets/*` — Static assets

### Step 3: Check bundle size
```bash
ls -lh dist/assets/*.js
```
Target sizes:
- Engine: ~166KB (gzip ~40KB)
- Phaser: ~1.2MB (gzip ~350KB)
- Game code: varies

### Step 4: Validate the build
```bash
npx vite preview --port 4173
```
Use Preview tools to verify the production build works.

### Step 5: Asset optimization
Review `AssetManifest`:
- `boot` tier: Loading screen assets only (< 50KB)
- `main` tier: Core gameplay assets
- `deferred` tier: Non-critical, loaded on demand via `loadDeferred()`

### Optimization Checklist

- [ ] Run tests: `npm run test` — all passing
- [ ] Images compressed (tinypng or similar)
- [ ] Audio in OGG + MP3 for cross-browser
- [ ] Sprite atlases instead of individual images
- [ ] No unused assets in manifest
- [ ] `boot` tier minimal
- [ ] Tree-shaking: import only what you use from clik-engine
- [ ] Debug mode off in production (`debug: false`)
- [ ] Remove `devStartScene` in production config
- [ ] Console logging disabled: `ConsoleReporter.disable()` in production

### Port Hand-Off

The `dist/` folder is self-contained static site:
1. `npm run build`
2. Deploy `dist/` to any static host (Vercel, Netlify, GitHub Pages, S3)
3. No runtime engine dependency

### Mobile (Capacitor)

A `capacitor.config.tmpl.ts` template is included:
1. Rename to `capacitor.config.ts`
2. `npm install @capacitor/core @capacitor/cli`
3. `npx cap init <name> com.example.<name>`
4. `npx cap add android` / `npx cap add ios`
5. `npm run build && npx cap sync`
6. Open in Android Studio / Xcode

The engine handles:
- Touch input (gestures, virtual controls)
- Responsive scaling (mobile presets)
- App lifecycle (pause/resume on background)
- Safe area insets (notch avoidance)
- Audio unlock on first interaction
