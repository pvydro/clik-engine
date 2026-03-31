import type Phaser from 'phaser';
import type { DebugConsole, ConsolePrinter } from './DebugConsole';
import { profiler } from './Profiler';
import type { BaseScene } from '../scenes/BaseScene';
import { Entity } from '../entity/Entity';

/**
 * Registers the 14 built-in console commands.
 */
export function registerBuiltinCommands(con: DebugConsole, game: Phaser.Game): void {
  // ── help ──────────────────────────────────────────────────────────
  con.register('help', (args, out) => {
    if (args) {
      const cmd = con.getCommands().get(args.toLowerCase());
      if (cmd) {
        out.log(`${args}: ${cmd.description}`);
      } else {
        out.error(`Unknown command: ${args}`);
      }
      return;
    }
    out.log('Available commands:');
    const commands = con.getCommands();
    const maxLen = Math.max(...[...commands.keys()].map(k => k.length));
    for (const [name, cmd] of commands) {
      out.log(`  ${name.padEnd(maxLen + 2)} ${cmd.description}`);
    }
  }, 'List all commands or show details for one (help <cmd>)');

  // ── clear ─────────────────────────────────────────────────────────
  con.register('clear', (_args, _out) => {
    con.clear();
  }, 'Clear console output');

  // ── entities ──────────────────────────────────────────────────────
  con.register('entities', (_args, out) => {
    const scene = con.getActiveGameScene();
    if (!scene) { out.warn('No active game scene'); return; }

    const registry = scene.getEntityRegistry();
    if (!registry || registry.count === 0) {
      out.log('No entities registered');
      return;
    }

    out.log(`Entities: ${registry.count}`);
    const all = registry.getAll();
    for (const entity of all) {
      const tags = entity.getTags().length > 0 ? ` [${entity.getTags().join(', ')}]` : '';
      const components = [...(entity as unknown as { components: Map<string, unknown> }).components?.keys?.() ?? []];
      const comps = components.length > 0 ? ` (${components.join(', ')})` : '';
      out.log(`  ${entity.constructor.name} @ (${Math.round(entity.x)}, ${Math.round(entity.y)})${tags}${comps}`);
    }
  }, 'List all entities with types, tags, and components');

  // ── spawn ─────────────────────────────────────────────────────────
  con.register('spawn', (args, out) => {
    const scene = con.getActiveGameScene();
    if (!scene) { out.warn('No active game scene'); return; }

    const parts = args.split(/\s+/);
    const type = parts[0];
    if (!type) { out.error('Usage: spawn <type> [x] [y]'); return; }

    const x = parts[1] ? parseFloat(parts[1]) : scene.cameras.main.centerX;
    const y = parts[2] ? parseFloat(parts[2]) : scene.cameras.main.centerY;

    // Try EntityFactory from registry first
    const factory = game.registry.get('__clikEntityFactory') as
      { create?: (scene: Phaser.Scene, type: string, x: number, y: number) => Entity } | undefined;

    if (factory?.create) {
      try {
        const entity = factory.create(scene, type, x, y);
        out.log(`Spawned ${type} at (${Math.round(x)}, ${Math.round(y)})`);
        return;
      } catch {
        // Fall through to basic entity
      }
    }

    // Basic entity
    const entity = new Entity(scene, x, y);
    entity.addTag(type);
    const registry = (scene as unknown as { entities: { register: (e: Entity) => void } }).entities;
    if (registry?.register) {
      registry.register(entity);
    }
    scene.add.existing(entity);
    out.log(`Spawned entity tagged "${type}" at (${Math.round(x)}, ${Math.round(y)})`);
  }, 'Spawn an entity (spawn <type> [x] [y])');

  // ── kill ──────────────────────────────────────────────────────────
  con.register('kill', (args, out) => {
    const scene = con.getActiveGameScene();
    if (!scene) { out.warn('No active game scene'); return; }

    const registry = scene.getEntityRegistry();
    if (!registry) { out.warn('No entity registry'); return; }

    const target = args.trim().toLowerCase();
    if (!target) { out.error('Usage: kill <type|tag|all>'); return; }

    let killed = 0;
    if (target === 'all') {
      killed = registry.count;
      registry.clear();
    } else {
      // Try by tag first, then by type
      let entities = registry.getByTag(target);
      if (entities.length === 0) {
        entities = registry.getAll().filter(e => e.constructor.name.toLowerCase() === target);
      }
      for (const entity of entities) {
        entity.destroy();
        killed++;
      }
    }

    out.log(`Killed ${killed} entity(s)`);
  }, 'Destroy entities (kill <type|tag|all>)');

  // ── set ───────────────────────────────────────────────────────────
  con.register('set', (args, out) => {
    const match = args.match(/^(\S+)\s+(.+)$/);
    if (!match) { out.error('Usage: set <key> <value>'); return; }

    const [, key, rawValue] = match;
    let value: unknown = rawValue;

    // Parse value types
    if (rawValue === 'true') value = true;
    else if (rawValue === 'false') value = false;
    else if (rawValue === 'null') value = null;
    else if (!isNaN(Number(rawValue))) value = Number(rawValue);

    game.registry.set(key, value);
    out.log(`Set registry["${key}"] = ${JSON.stringify(value)}`);
  }, 'Set a game registry value (set <key> <value>)');

  // ── get ───────────────────────────────────────────────────────────
  con.register('get', (args, out) => {
    const key = args.trim();
    if (!key) { out.error('Usage: get <key>'); return; }

    const value = game.registry.get(key);
    if (value === undefined) {
      out.warn(`registry["${key}"] is undefined`);
    } else {
      out.log(`registry["${key}"] = ${JSON.stringify(value)}`);
    }
  }, 'Read a game registry value (get <key>)');

  // ── scene ─────────────────────────────────────────────────────────
  con.register('scene', (args, out) => {
    const arg = args.trim();

    if (!arg || arg === 'list') {
      const allScenes = game.scene.getScenes(false);
      const active = game.scene.getScenes(true).map(s => s.scene.key);
      out.log('Scenes:');
      for (const s of allScenes) {
        if (s.scene.key.startsWith('__clik_')) continue;
        const status = active.includes(s.scene.key) ? ' [ACTIVE]' : '';
        out.log(`  ${s.scene.key}${status}`);
      }
      return;
    }

    // Switch scene
    try {
      const currentScene = con.getActiveGameScene();
      if (currentScene) {
        game.scene.stop(currentScene.scene.key);
      }
      game.scene.start(arg);
      out.log(`Started scene: ${arg}`);
    } catch (err) {
      out.error(`Failed to start scene "${arg}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }, 'List scenes (scene list) or switch scene (scene <key>)');

  // ── timescale ─────────────────────────────────────────────────────
  con.register('timescale', (args, out) => {
    const value = parseFloat(args);
    if (isNaN(value) || value <= 0) {
      const currentScale = (game.loop as unknown as Record<string, unknown>)['timeScale'] ?? 1;
      out.log(`Current timescale: ${currentScale}`);
      out.log('Usage: timescale <value> (e.g. 0.5 for half speed, 2 for double)');
      return;
    }
    // Phaser's TimeStep.timeScale exists at runtime but isn't in all type definitions
    const loop = game.loop as unknown as Record<string, unknown>;
    loop['timeScale'] = value;
    out.log(`Timescale set to ${value}`);
  }, 'Set game speed (timescale <value>)');

  // ── pause ─────────────────────────────────────────────────────────
  con.register('pause', (_args, out) => {
    const scene = con.getActiveGameScene();
    if (!scene) { out.warn('No active game scene'); return; }
    game.scene.pause(scene.scene.key);
    out.log(`Paused: ${scene.scene.key}`);
  }, 'Pause the active game scene');

  // ── resume ────────────────────────────────────────────────────────
  con.register('resume', (_args, out) => {
    const scene = con.getActiveGameScene();
    if (!scene) { out.warn('No active game scene'); return; }
    game.scene.resume(scene.scene.key);
    out.log(`Resumed: ${scene.scene.key}`);
  }, 'Resume the paused game scene');

  // ── inspect ───────────────────────────────────────────────────────
  con.register('inspect', (_args, out) => {
    const inspector = game.scene.getScene('__clik_state_inspector');
    if (!inspector) { out.warn('State inspector not available (debug mode required)'); return; }

    if (inspector.scene.isVisible()) {
      inspector.scene.setVisible(false);
      out.log('State inspector hidden');
    } else {
      inspector.scene.setVisible(true);
      out.log('State inspector shown');
    }
  }, 'Toggle the state inspector overlay');

  // ── fps ───────────────────────────────────────────────────────────
  con.register('fps', (_args, out) => {
    const fps = Math.round(game.loop.actualFps);
    const avgFrame = profiler.getAverageFrameTime();
    const summary = profiler.getTimingSummary();
    const scale = (game.loop as unknown as Record<string, unknown>)['timeScale'] ?? 1;
    out.log(`FPS: ${fps} | Frame: ${avgFrame.toFixed(2)}ms | Timescale: ${scale}`);
    for (const [label, value] of Object.entries(summary)) {
      if (label === 'frame') continue;
      out.log(`  ${label}: ${value}`);
    }
  }, 'Show FPS and performance metrics');

  // ── playtest ──────────────────────────────────────────────────────
  con.register('playtest', (args, out) => {
    const pm = game.registry.get('__clikPluginManager') as
      { get?: (name: string) => { getSummary?: () => string; exportJSON?: () => string; startRecording?: () => void; stopRecording?: () => void; isRecording?: () => boolean } | null } | undefined;

    const reporter = pm?.get?.('PlaytestReporter') as
      { getSummary: () => string; exportJSON: () => string; startRecording: () => void; stopRecording: () => void; isRecording: () => boolean } | null;

    if (!reporter) {
      out.warn('PlaytestReporter plugin not registered. Add it to ClikGameConfig.plugins.');
      return;
    }

    const subcmd = args.trim().toLowerCase();
    if (subcmd === 'start') {
      reporter.startRecording();
      out.log('Playtest recording started');
    } else if (subcmd === 'stop') {
      reporter.stopRecording();
      out.log('Playtest recording stopped');
    } else if (subcmd === 'export') {
      out.log(reporter.exportJSON());
    } else if (subcmd === 'status') {
      out.log(`Recording: ${reporter.isRecording() ? 'YES' : 'NO'}`);
    } else {
      // Default: show summary
      out.log(reporter.getSummary());
    }
  }, 'Show playtest report (playtest [start|stop|export|status])');
}
