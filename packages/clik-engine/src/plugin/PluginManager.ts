import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { BaseScene } from '../scenes/BaseScene';
import type { ClikPlugin, ClikScenePlugin, ClikPluginConfig } from './ClikPlugin';
import { isScenePlugin } from './ClikPlugin';

/**
 * Manages plugin lifecycle: registration, initialization, dependency resolution,
 * scene hooks, and error isolation.
 */
export class PluginManager {
  private plugins: ClikPlugin[] = [];
  private scenePlugins: ClikScenePlugin[] = [];
  private initialized = false;

  /** Register plugins from config. Validates names, dependencies, and ordering. */
  register(configs: ClikPluginConfig[]): void {
    const names = new Set<string>();

    for (const entry of configs) {
      const plugin = entry.plugin;

      // Validate unique names
      if (names.has(plugin.name)) {
        ConsoleReporter.error(
          `Plugin '${plugin.name}' is already registered`,
          'Each plugin must have a unique name.'
        );
        continue;
      }
      names.add(plugin.name);

      // Validate dependencies exist in prior registrations
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!names.has(dep)) {
            ConsoleReporter.error(
              `Plugin '${plugin.name}' depends on '${dep}' which is not registered before it`,
              `Register '${dep}' before '${plugin.name}' in the plugins array.`
            );
          }
        }
      }

      this.plugins.push(plugin);
      if (isScenePlugin(plugin)) {
        this.scenePlugins.push(plugin);
      }
    }

    ConsoleReporter.engine(`Registered ${this.plugins.length} plugin(s): ${this.plugins.map(p => p.name).join(', ')}`);
  }

  /** Initialize all plugins. Called once after game boot. */
  init(game: Phaser.Game, configs: ClikPluginConfig[]): void {
    if (this.initialized) return;
    this.initialized = true;

    const configMap = new Map(configs.map(c => [c.plugin.name, c.config]));

    for (const plugin of this.plugins) {
      try {
        plugin.init(game, configMap.get(plugin.name));
        ConsoleReporter.engine(`Plugin '${plugin.name}' v${plugin.version} initialized`);
      } catch (err) {
        ConsoleReporter.error(
          `Plugin '${plugin.name}' failed to initialize: ${err}`,
          'The plugin has been skipped. Check the plugin implementation.'
        );
      }
    }
  }

  /** Notify scene plugins of scene create */
  onSceneCreate(scene: BaseScene): void {
    for (const plugin of this.scenePlugins) {
      try {
        plugin.onSceneCreate?.(scene);
      } catch (err) {
        ConsoleReporter.error(`Plugin '${plugin.name}' error in onSceneCreate: ${err}`);
      }
    }
  }

  /** Notify scene plugins of scene update */
  onSceneUpdate(scene: BaseScene, time: number, delta: number): void {
    for (const plugin of this.scenePlugins) {
      try {
        plugin.onSceneUpdate?.(scene, time, delta);
      } catch (err) {
        ConsoleReporter.error(`Plugin '${plugin.name}' error in onSceneUpdate: ${err}`);
      }
    }
  }

  /** Notify scene plugins of scene shutdown */
  onSceneShutdown(scene: BaseScene): void {
    for (const plugin of this.scenePlugins) {
      try {
        plugin.onSceneShutdown?.(scene);
      } catch (err) {
        ConsoleReporter.error(`Plugin '${plugin.name}' error in onSceneShutdown: ${err}`);
      }
    }
  }

  /** Get a registered plugin by name */
  get(name: string): ClikPlugin | undefined {
    return this.plugins.find(p => p.name === name);
  }

  /** Get all registered plugins */
  getAll(): readonly ClikPlugin[] {
    return this.plugins;
  }

  /** Destroy all plugins in reverse order */
  destroy(): void {
    for (let i = this.plugins.length - 1; i >= 0; i--) {
      try {
        this.plugins[i].destroy();
      } catch (err) {
        ConsoleReporter.error(`Plugin '${this.plugins[i].name}' error in destroy: ${err}`);
      }
    }
    this.plugins.length = 0;
    this.scenePlugins.length = 0;
    this.initialized = false;
  }
}
