---
name: clik-publish
description: Publish @pvydro/clik-engine to GitHub Packages and set up game projects to consume it
---

## What I do

- Build and publish the engine to GitHub Packages
- Set up game projects to install @pvydro/clik-engine as a dependency
- Handle versioning, authentication, and registry configuration

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
3. Tag: `v0.1.0` (or next version)
4. Publish — workflow runs tests, builds, publishes to GitHub Packages

### Option 2: Manual publish
```bash
cd packages/clik-engine
npm run test                    # must pass
npm run build                   # builds to dist/
npm publish                     # publishes @pvydro/clik-engine
```

Requires `NODE_AUTH_TOKEN` environment variable set to a GitHub PAT with `write:packages` scope.

### Versioning
Before publishing a new version, bump the version in `packages/clik-engine/package.json`:
```bash
cd packages/clik-engine
npm version patch    # 0.1.0 → 0.1.1
npm version minor    # 0.1.0 → 0.2.0
npm version major    # 0.1.0 → 1.0.0
```

## Setting Up a Game Project

### 1. Authenticate (once per machine)
The developer needs a GitHub personal access token with `read:packages` scope:
```bash
npm login --registry=https://npm.pkg.github.com
# Username: github-username
# Password: github-personal-access-token
```

Or set it via environment variable:
```bash
export NPM_TOKEN=ghp_xxxxxxxxxxxx
echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> ~/.npmrc
```

### 2. Project .npmrc
Add to the game project root:
```
@pvydro:registry=https://npm.pkg.github.com
```
This tells npm to fetch `@pvydro/*` packages from GitHub instead of npmjs.com.

### 3. Install
```bash
npm install @pvydro/clik-engine
```

### 4. Import
```typescript
import { createGame, BaseScene, ScalePreset } from '@pvydro/clik-engine';
```

### Using create-clik-game
The CLI scaffolder already includes the `.npmrc` and correct imports:
```bash
npx create-clik-game my-game
cd my-game
npm install    # installs @pvydro/clik-engine from GitHub Packages
npm run dev
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `401 Unauthorized` | Run `npm login --registry=https://npm.pkg.github.com` with a valid PAT |
| `404 Not Found` | Package not published yet — create a GitHub release first |
| `ENEEDAUTH` | Missing `.npmrc` in project root — add `@pvydro:registry=https://npm.pkg.github.com` |
| Wrong version | Check `npm view @pvydro/clik-engine versions --registry=https://npm.pkg.github.com` |

## Package Details

- **Name**: `@pvydro/clik-engine`
- **Registry**: `https://npm.pkg.github.com`
- **Repository**: `github.com/pvydro/clik-engine`
- **Main**: `dist/clik-engine.js` (ES module)
- **Types**: `dist/index.d.ts`
- **Dependency**: Phaser is a regular dependency (installed transitively)
