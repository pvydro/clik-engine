import { describe, it, expect } from 'vitest';
import { BiomeGenerator } from '../../../src/pcg/generators/BiomeGenerator';

describe('BiomeGenerator', () => {
  const biomes = new BiomeGenerator({
    biomes: [
      { name: 'forest', tilePalette: { floor: 10, wall: 11 }, enemyTypes: ['wolf', 'bear'] },
      { name: 'cave', tilePalette: { floor: 20, wall: 21 }, enemyTypes: ['bat', 'spider'] },
      { name: 'lava', tilePalette: { floor: 30, wall: 31 }, enemyTypes: ['fire_imp'] },
    ],
  });

  it('getBiomeForRegion cycles through biomes', () => {
    expect(biomes.getBiomeForRegion(0).name).toBe('forest');
    expect(biomes.getBiomeForRegion(1).name).toBe('cave');
    expect(biomes.getBiomeForRegion(2).name).toBe('lava');
    expect(biomes.getBiomeForRegion(3).name).toBe('forest'); // wraps
  });

  it('getBiome finds by name', () => {
    expect(biomes.getBiome('cave')?.name).toBe('cave');
    expect(biomes.getBiome('unknown')).toBeUndefined();
  });

  it('getEnemyTypes returns biome enemies', () => {
    expect(biomes.getEnemyTypes('forest')).toContain('wolf');
    expect(biomes.getEnemyTypes('forest')).toContain('bear');
    expect(biomes.getEnemyTypes('unknown')).toEqual([]);
  });

  it('isTransitionZone detects edges', () => {
    const bg = new BiomeGenerator({ transitionWidth: 3 });
    expect(bg.isTransitionZone(0, 20)).toBe(true);   // left edge
    expect(bg.isTransitionZone(1, 20)).toBe(true);   // left edge
    expect(bg.isTransitionZone(10, 20)).toBe(false);  // middle
    expect(bg.isTransitionZone(18, 20)).toBe(true);  // right edge
  });

  it('getTransitionBlend returns blend info', () => {
    const bg = new BiomeGenerator({
      biomes: [
        { name: 'a', tilePalette: {}, enemyTypes: [] },
        { name: 'b', tilePalette: {}, enemyTypes: [] },
      ],
      transitionWidth: 3,
    });
    const blend = bg.getTransitionBlend(18, 20, 2);
    expect(blend).not.toBeNull();
    expect(blend!.blend).toBeGreaterThan(0);
  });

  it('getTransitionBlend returns null for non-transition', () => {
    const bg = new BiomeGenerator({ transitionWidth: 2 });
    expect(bg.getTransitionBlend(10, 20, 3)).toBeNull();
  });

  it('getBiomeNames returns all names', () => {
    expect(biomes.getBiomeNames()).toEqual(['forest', 'cave', 'lava']);
  });

  it('biomeCount returns count', () => {
    expect(biomes.biomeCount).toBe(3);
  });

  it('getAllBiomes returns all defs', () => {
    expect(biomes.getAllBiomes()).toHaveLength(3);
  });
});
