import { ConsoleReporter } from '../debug/ConsoleReporter';

/**
 * Helpers for Capacitor native integration.
 * Uses globalThis.Capacitor which is injected by the Capacitor runtime.
 * Capacitor plugins must be installed separately in the game project.
 *
 * Usage:
 * ```
 * import { CapacitorHelper } from 'clik-engine';
 * if (CapacitorHelper.isNative()) {
 *   CapacitorHelper.hideStatusBar();
 *   CapacitorHelper.hapticImpact('medium');
 * }
 * ```
 */
export const CapacitorHelper = {
  /** Check if running inside Capacitor */
  isCapacitor(): boolean {
    return typeof (globalThis as Record<string, unknown>).Capacitor !== 'undefined';
  },

  /** Get the platform: 'ios', 'android', or 'web' */
  getPlatform(): string {
    const cap = (globalThis as Record<string, unknown>).Capacitor as { getPlatform?: () => string } | undefined;
    return cap?.getPlatform?.() ?? 'web';
  },

  /** Check if running on a native platform (not web) */
  isNative(): boolean {
    const platform = CapacitorHelper.getPlatform();
    return platform === 'ios' || platform === 'android';
  },

  /**
   * Call a Capacitor plugin method. Plugins must be registered globally.
   * This is a generic helper — use specific methods below for common plugins.
   */
  async callPlugin(pluginName: string, method: string, args?: unknown): Promise<unknown> {
    if (!CapacitorHelper.isCapacitor()) return undefined;
    try {
      const cap = (globalThis as Record<string, unknown>).Capacitor as {
        Plugins?: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>;
      };
      const plugin = cap?.Plugins?.[pluginName];
      if (!plugin || !plugin[method]) {
        ConsoleReporter.engine(`Capacitor: plugin ${pluginName}.${method} not available`);
        return undefined;
      }
      return await plugin[method](args);
    } catch (e) {
      ConsoleReporter.error(`Capacitor: ${pluginName}.${method} failed — ${e}`);
      return undefined;
    }
  },

  /** Hide the splash screen */
  async hideSplashScreen(): Promise<void> {
    await CapacitorHelper.callPlugin('SplashScreen', 'hide');
    ConsoleReporter.engine('Capacitor: splash screen hidden');
  },

  /** Hide the status bar */
  async hideStatusBar(): Promise<void> {
    await CapacitorHelper.callPlugin('StatusBar', 'hide');
  },

  /** Set status bar style */
  async setStatusBarStyle(style: 'dark' | 'light'): Promise<void> {
    await CapacitorHelper.callPlugin('StatusBar', 'setStyle', { style: style === 'dark' ? 'DARK' : 'LIGHT' });
  },

  /** Trigger haptic impact feedback */
  async hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    const styleMap = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' };
    await CapacitorHelper.callPlugin('Haptics', 'impact', { style: styleMap[style] });
  },

  /** Vibrate the device */
  async vibrate(): Promise<void> {
    await CapacitorHelper.callPlugin('Haptics', 'vibrate');
  },
};
