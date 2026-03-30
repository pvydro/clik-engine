# Migration Guide

## v0.4.x → v0.5.0 (Unreleased)

### New Config Fields

`ClikGameConfig` now accepts `network`, `accessibility`, and `plugins`:

```typescript
// Before
createGame({
  name: 'my-game',
  scenes: [...],
});

// After (optional — all new fields are optional)
createGame({
  name: 'my-game',
  scenes: [...],
  network: { url: 'ws://localhost:8080' },
  accessibility: { fontScale: 1, reducedMotion: false },
  plugins: [{ plugin: MyPlugin, config: { ... } }],
});
```

### InputManager Refactored

InputManager now delegates to three providers internally. **The public API is unchanged** — `isDown()`, `justPressed()`, `axis()`, etc. all work exactly as before.

New: you can access providers directly for advanced use:

```typescript
this.actions.getKeyboardProvider()
this.actions.getTouchProvider()
this.actions.getGamepadProvider()
```

### New BaseScene Accessors

```typescript
this.network  // NetworkManager (requires config.network.url)
this.lobby    // Lobby (depends on network)
this.room     // Room (depends on network)
this.a11y     // A11yManager
```

All are lazy-created on first access, just like existing `this.actions`, `this.audio`, `this.save`.

### Anchor.apply() Returns Cleanup Function

```typescript
// Before
Anchor.apply(scene, target, { position: 'top-left' });

// After — returns cleanup function
const cleanup = Anchor.apply(scene, target, { position: 'top-left' });
// Call cleanup() to remove the resize listener
```

### New Exports

The following are now available from `@pvydro/clik-engine`:

- Network: `NetworkManager`, `Lobby`, `Room`, `StateSync`, `NetworkSync`
- AI: `BehaviorTree`, `Blackboard`, `BTNode`, `NodeStatus`, all node types, `Steering`, `SteeringCalculator`, `BehaviorTreeComponent`, `SteeringComponent`
- Plugin: `PluginManager`, `ClikPlugin`, `ClikScenePlugin`, `isScenePlugin`
- UI: `ToastManager`, `ModalStack`, `Dropdown`, `Checkbox`, `RadioGroup`
- Input: `InputBuffer`, `RemapHelper`, `KeyboardProvider`, `TouchProvider`, `GamepadProvider`
- Particles: `TrailRenderer`, `AdvancedParticlePresets`
- Animation: `AnimationBlender`
- Effects: `CustomShaderPipeline`, `ShaderEffects`
- Debug: `ProfilerDashboard`
- Platform: `HapticFeedback`
- Validation: `validatePositiveNumber`, `validateNonEmptyString`, `validateEnum`, `validateHexColor`, `validatePositiveInt`
