---
name: clik-publish
description: Publish clik-engine to npm and set up game projects to consume it
---

## What I do

- Build and publish the engine to the public npm registry
- Set up game projects to install clik-engine as a dependency
- Handle versioning and release workflow

## When to use me

Use `/clik-publish` when:
- You want to publish a new version of the engine
- You're setting up a new game project to use the engine as a package
- You need to troubleshoot package installation issues

---

## Publishing the Engine

### Option 1: GitHub Release (automated)
Create a release on GitHub — the publish workflow runs automatically:
1. Go to github.com/pvydro/clik-engine/releases
2. Click "Create a new release"
3. Tag: `v0.5.0` (or next version)
4. Publish — workflow runs tests, builds, publishes to npm

Requires `NPM_TOKEN` secret configured in the GitHub repo settings.

### Option 2: Manual publish
```bash
cd packages/clik-engine
npm run test                    # must pass
npm run build                   # builds to dist/
npm publish --access public     # publishes to npm
```

Requires `npm login` or `NPM_TOKEN` environment variable.

### Versioning
Before publishing a new version, bump the version in `packages/clik-engine/package.json`:
```bash
cd packages/clik-engine
npm version patch    # 0.4.0 → 0.4.1
npm version minor    # 0.4.0 → 0.5.0
npm version major    # 0.4.0 → 1.0.0
```

## Setting Up a Game Project

### 1. Install
```bash
npm install clik-engine phaser
```

### 2. Import
```typescript
import { createGame, BaseScene, ScalePreset } from 'clik-engine';
```

### Using create-clik-game
```bash
npx create-clik-game my-game
cd my-game
npm install
npm run dev
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `404 Not Found` | Package not published yet — create a GitHub release first |
| Wrong version | Check `npm view clik-engine versions` |
| Types not found | Ensure `"types": "dist/index.d.ts"` in package.json |

## Package Details

- **Name**: `clik-engine`
- **Registry**: `https://registry.npmjs.org`
- **Repository**: `github.com/pvydro/clik-engine`
- **Main**: `dist/clik-engine.js` (ES module)
- **Types**: `dist/index.d.ts`
- **Dependency**: Phaser is a regular dependency (installed transitively)
