---
name: clik-playtest
description: Autonomously boot, playtest, identify bugs, and fix issues in clik-engine games using Preview tools
---

## What I do

- Boot the game via `preview_start` using the project's `.claude/launch.json`
- Take screenshots to observe game state visually
- Read structured `[CLIK:*]` console logs to understand what's happening
- Click UI elements and interact with the game
- Check entity states, physics, camera, and scene transitions
- Identify visual bugs, logic errors, and UX issues
- Fix issues in source code, reload, and verify the fix
- Report a playtest summary when done

## When to use me

Use `/clik-playtest` when:
- You want to test the current state of the game
- You've made changes and want to verify they work
- You want an autonomous play-through to find bugs
- You want to iterate on game feel and polish

---

## Playtest Workflow

### Step 1: Boot the game
```
preview_start("dev")   // or whatever name is in .claude/launch.json
```

### Step 2: Wait for load, take initial screenshot
```
preview_screenshot()
```

### Step 3: Read console logs for engine state
```
preview_console_logs(search: "[CLIK:")
```

Key log prefixes:
- `[CLIK:SCENE]` — Scene lifecycle (init, create, shutdown, transitions)
- `[CLIK:STATE]` — Game state changes (score, position, health, FSM states)
- `[CLIK:INPUT]` — Actions, gestures, combos, button clicks
- `[CLIK:ERROR]` — Errors with fix suggestions
- `[CLIK:ASSET]` — Asset loading status
- `[CLIK:ENGINE]` — Engine lifecycle, camera, particles, breakpoints
- `[CLIK:AUDIO]` — Music/SFX events
- `[CLIK:SAVE]` — Save/load operations

### Step 4: Interact with the game
- Use `preview_click` on buttons and UI elements
- Use `preview_snapshot` to get accessibility tree
- Use `preview_eval` to trigger game events or check state
- Access game instance: `window.__CLIK_GAME` (when debug: true)

### Step 5: Check systems
- **Debug overlay**: FPS, scene, entities (top-left), state inspector (top-right)
- **Scene transitions**: trigger via `director.go()`, verify smooth animation
- **Physics**: check collisions, one-way platforms, body velocities
- **Camera**: follow, bounds, shake effects
- **UI**: all 14 components render on canvas (visible in screenshots)
- **Entity components**: Health, Movement, Patrol, Spawner behaviors
- **Audio**: music crossfade, SFX, mute states
- **Save**: data persists across reloads
- **Profiler**: `profiler.getTimingSummary()` for performance

### Step 6: Fix and verify
1. Edit the source file
2. Reload: `preview_eval("location.reload()")`
3. Take screenshot to verify fix
4. Re-read console logs for errors
5. Run tests: `npm run test`

### Step 7: Report
Summarize:
- Scenes tested
- Bugs found and fixed
- Performance observations (FPS, entity count)
- Remaining issues
- Game feel notes

## Debug Overlay Reading

When `debug: true`, the canvas shows:
- **Top-left**: FPS, active scene(s), entity count, memory
- **Top-right**: registered state from `inspectState()` (player HP, position, FSM state, etc.)
- **Red banner**: error messages with fix suggestions (if scene throws)

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Black screen | Scene not starting | Check `scenes` array in config, check `devStartScene` |
| No input response | Missing `super.update()` | Add `super.update(time, delta)` to scene |
| Asset not found | Missing from manifest | Add to `AssetManifest` in correct tier |
| UI not visible | Using DOM elements | Switch to Phaser-native UI components |
| State not in overlay | Not registered | Call `this.inspectState()` in `create()` |
| Physics not working | Missing `enableBody` | Call `PhysicsHelper.enableBody(this, sprite)` |
| Camera not following | Follow not set | Call `cam.follow(target)` and `cam.setBounds()` |
| Transition stuck | Double transition | Check `director.isTransitioning()` before starting |
| Components not updating | Missing registry update | Call `entityRegistry.updateAll(delta)` in update loop |
| Save not persisting | Wrong slot/key | Check `SaveManager` slot index and game name |
