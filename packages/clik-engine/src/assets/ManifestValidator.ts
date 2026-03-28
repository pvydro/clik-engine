import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { AssetManifest, AssetEntry } from '../utils/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalAssets: number;
    boot: number;
    main: number;
    deferred: number;
    duplicateKeys: string[];
  };
}

/**
 * Validates an AssetManifest for common issues before loading.
 * Call at boot to catch configuration errors early.
 */
export function validateManifest(manifest: AssetManifest): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allKeys: string[] = [];
  const allEntries: AssetEntry[] = [];

  const tiers: { name: string; entries: AssetEntry[] | undefined }[] = [
    { name: 'boot', entries: manifest.boot },
    { name: 'main', entries: manifest.main },
    { name: 'deferred', entries: manifest.deferred },
  ];

  for (const tier of tiers) {
    if (!tier.entries) continue;
    for (const entry of tier.entries) {
      allEntries.push(entry);
      allKeys.push(entry.key);

      // Check for missing fields
      if (!entry.key) {
        errors.push(`${tier.name}: asset missing 'key' field`);
      }
      if (!entry.type) {
        errors.push(`${tier.name}: asset '${entry.key}' missing 'type' field`);
      }
      if (!entry.path) {
        errors.push(`${tier.name}: asset '${entry.key}' missing 'path' field`);
      }

      // Check valid types
      const validTypes = ['image', 'atlas', 'spritesheet', 'audio', 'json', 'tilemapJSON'];
      if (entry.type && !validTypes.includes(entry.type)) {
        errors.push(`${tier.name}: asset '${entry.key}' has invalid type '${entry.type}'`);
      }

      // Atlas-specific checks
      if (entry.type === 'atlas' && !entry.atlasPath) {
        warnings.push(`${tier.name}: atlas '${entry.key}' missing 'atlasPath' — will fail to load`);
      }

      // Spritesheet-specific checks
      if (entry.type === 'spritesheet' && !entry.frameConfig) {
        warnings.push(`${tier.name}: spritesheet '${entry.key}' missing 'frameConfig' — defaults to 32x32`);
      }

      // Audio should be array for cross-browser
      if (entry.type === 'audio' && typeof entry.path === 'string') {
        warnings.push(`${tier.name}: audio '${entry.key}' has single path — provide [ogg, mp3] array for cross-browser`);
      }
    }
  }

  // Check for duplicate keys
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const key of allKeys) {
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  if (duplicates.length > 0) {
    errors.push(`Duplicate asset keys: ${duplicates.join(', ')}`);
  }

  // Boot tier warnings
  if (manifest.boot && manifest.boot.length > 10) {
    warnings.push(`Boot tier has ${manifest.boot.length} assets — keep it small for fast loading`);
  }

  const result: ValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalAssets: allEntries.length,
      boot: manifest.boot?.length ?? 0,
      main: manifest.main?.length ?? 0,
      deferred: manifest.deferred?.length ?? 0,
      duplicateKeys: duplicates,
    },
  };

  // Log results
  if (errors.length > 0) {
    for (const e of errors) ConsoleReporter.error(`Manifest: ${e}`);
  }
  if (warnings.length > 0) {
    for (const w of warnings) ConsoleReporter.engine(`Manifest warning: ${w}`);
  }
  if (result.valid) {
    ConsoleReporter.asset(`Manifest valid: ${allEntries.length} assets (${result.stats.boot} boot, ${result.stats.main} main, ${result.stats.deferred} deferred)`);
  }

  return result;
}
