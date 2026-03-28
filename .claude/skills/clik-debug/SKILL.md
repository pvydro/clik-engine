---
name: clik-debug
description: Diagnose and fix issues in clik-engine games using console logs, screenshots, and state inspection
---

## What I do

- Filter console logs by `[CLIK:ERROR]`, `[CLIK:SCENE]`, `[CLIK:STATE]` to diagnose issues
- Take screenshots and read the DebugOverlay and StateInspector output
- Inspect specific elements via `preview_inspect`
- Check network requests for failed asset loads
- Cross-reference error messages with common fixes
- Propose and apply fixes, then verify via reload and screenshot

## When to use me

Use `/clik-debug` when:
- The game crashes, shows a blank screen, or behaves unexpectedly
- You see a red error banner on the canvas
- Console logs show `[CLIK:ERROR]` messages
- You need to understand the current game state
- Assets aren't loading or scenes aren't transitioning

---

## Diagnostic Workflow

### Step 1: Check for errors
```
preview_console_logs(search: "[CLIK:ERROR]")
```

### Step 2: Check scene lifecycle
```
preview_console_logs(search: "[CLIK:SCENE]")
```
Expected flow: `init → create → (update loop) → shutdown`

### Step 3: Check game state
```
preview_console_logs(search: "[CLIK:STATE]")
```
Or take a screenshot — the StateInspector renders registered state in the top-right.

### Step 4: Check for asset loading issues
```
preview_network(filter: "failed")
```
Or:
```
preview_console_logs(search: "[CLIK:ASSET]")
```

### Step 5: Take screenshot
Look for:
- Red error banner at top of canvas (engine renders errors on-screen)
- Debug overlay in top-left (FPS, entities, scene name)
- State inspector in top-right (registered game state)
- Visual anomalies (clipping, misalignment, wrong colors)

## Common Error Patterns

### Black Screen
**Symptoms**: Canvas renders but nothing visible
**Diagnosis**:
1. Check `[CLIK:SCENE]` — was `create` called?
2. Check `[CLIK:ERROR]` — any thrown errors?
3. Check if `devStartScene` points to a valid scene key
**Common fixes**:
- Scene key mismatch between config and constructor
- Missing `super.create()` call
- Assets not loaded (check manifest)

### Input Not Working
**Symptoms**: Key presses / touches have no effect
**Diagnosis**:
1. Check `[CLIK:INPUT]` — are actions being logged?
2. Verify `super.update(time, delta)` is called in the scene
3. Check action map in game config
**Common fixes**:
- Missing `super.update()` (InputManager won't poll)
- Action name mismatch between config and code
- Invalid key name in action binding

### Scene Transition Fails
**Symptoms**: Scene doesn't switch, or crashes on switch
**Diagnosis**:
1. Check `[CLIK:SCENE]` for transition logs
2. Check `[CLIK:ERROR]` for "Scene not found" messages
3. Verify target scene is in the `scenes` array
**Common fixes**:
- Scene not registered in `ClikGameConfig.scenes`
- Typo in scene key

### Assets Not Loading
**Symptoms**: Missing textures, no audio, broken sprites
**Diagnosis**:
1. Check `[CLIK:ASSET]` for loading logs
2. Check `preview_network(filter: "failed")` for 404s
3. Verify file exists in `public/assets/`
**Common fixes**:
- Wrong path in `AssetManifest` (must be relative to `public/`)
- Asset not in manifest at all
- Wrong asset type (e.g., `image` vs `spritesheet`)

### Performance Issues
**Symptoms**: Low FPS in debug overlay
**Diagnosis**:
1. Read FPS from debug overlay (screenshot top-left)
2. Check entity count — too many game objects?
3. Check for `update()` loops that create objects every frame
**Common fixes**:
- Use `ObjectPool` for frequently created/destroyed objects
- Destroy unused game objects
- Move deferred assets to `deferred` manifest tier

## Log Prefix Reference

| Prefix | Purpose | When Emitted |
|--------|---------|--------------|
| `[CLIK:ENGINE]` | Engine lifecycle | Game creation, config changes |
| `[CLIK:SCENE]` | Scene lifecycle | init, create, shutdown, transitions |
| `[CLIK:STATE]` | Game state | State changes registered via `inspectState` |
| `[CLIK:INPUT]` | Input events | Action pressed/released |
| `[CLIK:ERROR]` | Errors + suggestions | Any engine error with fix hint |
| `[CLIK:ASSET]` | Asset loading | Preloader progress, load complete |
| `[CLIK:AUDIO]` | Audio events | Music play/stop, SFX, unlock |
| `[CLIK:SAVE]` | Save/load | Save slot operations |
