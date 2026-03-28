import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { error: vi.fn(), engine: vi.fn(), asset: vi.fn() },
}));

import { validateManifest } from '../../src/assets/ManifestValidator';

describe('validateManifest', () => {
  it('passes a valid manifest', () => {
    const result = validateManifest({
      boot: [{ type: 'image', key: 'logo', path: 'assets/logo.png' }],
      main: [{ type: 'audio', key: 'bgm', path: ['assets/bgm.ogg', 'assets/bgm.mp3'] }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.stats.totalAssets).toBe(2);
  });

  it('detects missing key', () => {
    const result = validateManifest({
      main: [{ type: 'image', key: '', path: 'test.png' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("missing 'key'"))).toBe(true);
  });

  it('detects invalid type', () => {
    const result = validateManifest({
      main: [{ type: 'video' as any, key: 'vid', path: 'test.mp4' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('invalid type'))).toBe(true);
  });

  it('detects duplicate keys', () => {
    const result = validateManifest({
      boot: [{ type: 'image', key: 'bg', path: 'a.png' }],
      main: [{ type: 'image', key: 'bg', path: 'b.png' }],
    });
    expect(result.valid).toBe(false);
    expect(result.stats.duplicateKeys).toContain('bg');
  });

  it('warns about missing atlasPath', () => {
    const result = validateManifest({
      main: [{ type: 'atlas', key: 'sprites', path: 'sprites.png' }],
    });
    expect(result.warnings.some(w => w.includes('atlasPath'))).toBe(true);
  });

  it('warns about single audio path', () => {
    const result = validateManifest({
      main: [{ type: 'audio', key: 'sfx', path: 'sfx.mp3' }],
    });
    expect(result.warnings.some(w => w.includes('cross-browser'))).toBe(true);
  });

  it('warns about large boot tier', () => {
    const boot = Array.from({ length: 15 }, (_, i) => ({
      type: 'image' as const, key: `img${i}`, path: `img${i}.png`,
    }));
    const result = validateManifest({ boot });
    expect(result.warnings.some(w => w.includes('Boot tier'))).toBe(true);
  });

  it('counts tiers correctly', () => {
    const result = validateManifest({
      boot: [{ type: 'image', key: 'a', path: 'a.png' }],
      main: [
        { type: 'image', key: 'b', path: 'b.png' },
        { type: 'image', key: 'c', path: 'c.png' },
      ],
      deferred: [{ type: 'image', key: 'd', path: 'd.png' }],
    });
    expect(result.stats.boot).toBe(1);
    expect(result.stats.main).toBe(2);
    expect(result.stats.deferred).toBe(1);
    expect(result.stats.totalAssets).toBe(4);
  });

  it('handles empty manifest', () => {
    const result = validateManifest({});
    expect(result.valid).toBe(true);
    expect(result.stats.totalAssets).toBe(0);
  });
});
