---
name: clik-playtest
description: Autonomously boot, playtest, identify bugs, and fix issues in clik-engine games using Preview tools
---

## What I do

- Boot the game via `preview_start` using the project's `.claude/launch.json`
- Take screenshots to observe game state visually
- Read structured `[CLIK:*]` console logs to understand what's happening
- Click UI elements and interact with the game
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

Key log prefixes to filter:
- `[CLIK:SCENE]` — Scene lifecycle (init, create, shutdown)
- `[CLIK:STATE]` — Game state changes (score, position, health)
- `[CLIK:INPUT]` — Input actions triggered
- `[CLIK:ERROR]` — Errors with suggestions
- `[CLIK:ASSET]` — Asset loading status
- `[CLIK:ENGINE]` — Engine lifecycle

### Step 4: Interact with the game
- Use `preview_click` on buttons and UI elements
- Use `preview_snapshot` to get accessibility tree (find clickable elements)
- Use `preview_eval` to trigger game events or check state

### Step 5: Identify issues
Look for:
- **Visual bugs**: Misaligned elements, wrong colors, clipping
- **Logic errors**: Wrong scores, broken transitions, stuck states
- **Console errors**: Any `[CLIK:ERROR]` messages
- **Performance**: FPS shown in debug overlay (top-left of canvas)
- **Red error banner**: Engine renders errors on canvas when scenes throw

### Step 6: Fix and verify
1. Edit the source file
2. Reload: `preview_eval("location.reload()")`
3. Take screenshot to verify fix
4. Re-read console logs for errors

### Step 7: Report
Summarize findings:
- What scenes were tested
- Bugs found and fixed
- Remaining issues
- Game feel observations

## Debug Overlay Reading

When `debug: true`, the top-left corner of the canvas shows:
```
FPS: 60
Scene: game
Entities: 12
Mem: 45.2MB
```

The top-right shows registered state (from `inspectState`):
```
[player]
  hp: 3.00
  x: 400.00
  y: 300.00
  state: idle
```

## Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Black screen | Scene not starting | Check `scenes` array in config |
| No input response | Missing `super.update()` | Add `super.update(time, delta)` to scene |
| Asset not found | Missing from manifest | Add to `AssetManifest` in correct tier |
| UI not visible | Using DOM elements | Switch to Phaser-native UI (Button, Label, etc.) |
| State not in overlay | Not registered | Call `this.inspectState()` in `create()` |
