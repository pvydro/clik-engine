import type { AssetEntry, AssetManifest } from '../utils/types';

export function loadManifestTier(
  loader: Phaser.Loader.LoaderPlugin,
  entries: AssetEntry[]
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
        loader.spritesheet(entry.key, entry.path as string, { frameWidth: entry.frameConfig?.frameWidth ?? 32, frameHeight: entry.frameConfig?.frameHeight ?? 32 });
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
    }
  }
}

export function getAllEntries(manifest: AssetManifest): AssetEntry[] {
  return [
    ...(manifest.boot ?? []),
    ...(manifest.main ?? []),
    ...(manifest.deferred ?? []),
  ];
}
