import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { AssetEntry, AssetManifest } from '../utils/types';

export function loadManifestTier(
  loader: Phaser.Loader.LoaderPlugin,
  entries: AssetEntry[],
  onError?: (key: string, error: string) => void
): void {
  for (const entry of entries) {
    switch (entry.type) {
      case 'image':
        loader.image(entry.key, entry.path as string);
        break;
      case 'atlas':
        loader.atlas(entry.key, entry.path as string, entry.atlasPath);
        break;
      case 'spritesheet':
        loader.spritesheet(entry.key, entry.path as string, {
          frameWidth: entry.frameConfig?.frameWidth ?? 32,
          frameHeight: entry.frameConfig?.frameHeight ?? 32,
        });
        break;
      case 'audio':
        loader.audio(entry.key, entry.path);
        break;
      case 'json':
        loader.json(entry.key, entry.path as string);
        break;
      case 'tilemapJSON':
        loader.tilemapTiledJSON(entry.key, entry.path as string);
        break;
      default:
        ConsoleReporter.error(
          `Unknown asset type: ${(entry as AssetEntry).type}`,
          `Supported types: image, atlas, spritesheet, audio, json, tilemapJSON`
        );
    }
  }

  // Listen for per-file errors
  loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    ConsoleReporter.error(
      `Failed to load asset: ${file.key} (${file.type})`,
      `Check that the file exists at: ${file.url}`
    );
    onError?.(file.key, `Failed to load: ${file.url}`);
  });
}

export function getAllEntries(manifest: AssetManifest): AssetEntry[] {
  return [
    ...(manifest.boot ?? []),
    ...(manifest.main ?? []),
    ...(manifest.deferred ?? []),
  ];
}

/**
 * Load deferred assets on demand. Call this from a scene when you need
 * assets from the deferred tier.
 */
export function loadDeferred(
  scene: Phaser.Scene,
  manifest: AssetManifest,
  onComplete?: () => void
): void {
  if (!manifest.deferred?.length) {
    onComplete?.();
    return;
  }

  ConsoleReporter.asset(`Loading ${manifest.deferred.length} deferred assets`);
  loadManifestTier(scene.load, manifest.deferred);

  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    ConsoleReporter.asset('Deferred assets loaded');
    onComplete?.();
  });

  scene.load.start();
}
