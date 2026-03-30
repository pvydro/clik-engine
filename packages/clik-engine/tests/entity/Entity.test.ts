import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => {
  class MockContainer {
    x: number; y: number; scene: unknown; active = true; depth = 0;
    constructor(scene: unknown, x = 0, y = 0) { this.scene = scene; this.x = x; this.y = y; }
    destroy() { this.active = false; }
    setDepth() { return this; }
  }
  return { default: { GameObjects: { Container: MockContainer } } };
});

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), log: vi.fn(), state: vi.fn() },
}));

import { Entity } from '../../src/entity/Entity';
import { Component } from '../../src/entity/Component';
import { makeTestScene } from '../helpers/TestScene';

class StubComponent extends Component {
  attachCalled = false;
  detachCalled = false;
  updateCalls: number[] = [];

  onAttach(): void {
    this.attachCalled = true;
  }
  onDetach(): void {
    this.detachCalled = true;
  }
  update(delta: number): void {
    this.updateCalls.push(delta);
  }
}

describe('Entity', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  // ── Construction ──────────────────────────────────────────────────

  it('constructs with default position', () => {
    const entity = new Entity(scene);
    expect(entity.x).toBe(0);
    expect(entity.y).toBe(0);
  });

  it('constructs with custom position', () => {
    const entity = new Entity(scene, 10, 20);
    expect(entity.x).toBe(10);
    expect(entity.y).toBe(20);
  });

  it('adds itself to the scene', () => {
    new Entity(scene);
    expect(scene.add.existing).toHaveBeenCalled();
  });

  it('has default entityType', () => {
    const entity = new Entity(scene);
    expect(entity.entityType).toBe('entity');
  });

  it('entityType can be overridden', () => {
    const entity = new Entity(scene);
    entity.entityType = 'player';
    expect(entity.entityType).toBe('player');
  });

  // ── Components ────────────────────────────────────────────────────

  it('addComponent stores and returns the component', () => {
    const entity = new Entity(scene);
    const comp = new StubComponent();
    const result = entity.addComponent('stub', comp);
    expect(result).toBe(comp);
  });

  it('addComponent sets entity reference and calls onAttach', () => {
    const entity = new Entity(scene);
    const comp = new StubComponent();
    entity.addComponent('stub', comp);
    expect(comp.entity).toBe(entity);
    expect(comp.attachCalled).toBe(true);
  });

  it('getComponent returns a stored component', () => {
    const entity = new Entity(scene);
    const comp = new StubComponent();
    entity.addComponent('stub', comp);
    expect(entity.getComponent('stub')).toBe(comp);
  });

  it('getComponent returns undefined for missing component', () => {
    const entity = new Entity(scene);
    expect(entity.getComponent('nope')).toBeUndefined();
  });

  it('hasComponent returns true/false correctly', () => {
    const entity = new Entity(scene);
    expect(entity.hasComponent('stub')).toBe(false);
    entity.addComponent('stub', new StubComponent());
    expect(entity.hasComponent('stub')).toBe(true);
  });

  it('removeComponent calls onDetach and removes it', () => {
    const entity = new Entity(scene);
    const comp = new StubComponent();
    entity.addComponent('stub', comp);
    entity.removeComponent('stub');
    expect(comp.detachCalled).toBe(true);
    expect(entity.hasComponent('stub')).toBe(false);
  });

  it('removeComponent does nothing for missing component', () => {
    const entity = new Entity(scene);
    expect(() => entity.removeComponent('nope')).not.toThrow();
  });

  // ── Tags ──────────────────────────────────────────────────────────

  it('addTag / hasTag / removeTag work', () => {
    const entity = new Entity(scene);
    expect(entity.hasTag('enemy')).toBe(false);
    entity.addTag('enemy');
    expect(entity.hasTag('enemy')).toBe(true);
    entity.removeTag('enemy');
    expect(entity.hasTag('enemy')).toBe(false);
  });

  it('addTag returns this for chaining', () => {
    const entity = new Entity(scene);
    expect(entity.addTag('a')).toBe(entity);
  });

  it('removeTag returns this for chaining', () => {
    const entity = new Entity(scene);
    expect(entity.removeTag('a')).toBe(entity);
  });

  it('getTags returns all tags', () => {
    const entity = new Entity(scene);
    entity.addTag('a').addTag('b');
    expect(entity.getTags()).toEqual(expect.arrayContaining(['a', 'b']));
    expect(entity.getTags()).toHaveLength(2);
  });

  it('addTag does not duplicate existing tags', () => {
    const entity = new Entity(scene);
    entity.addTag('x').addTag('x');
    expect(entity.getTags()).toEqual(['x']);
  });

  // ── updateComponents ──────────────────────────────────────────────

  it('updateComponents calls update on enabled components', () => {
    const entity = new Entity(scene);
    const comp = new StubComponent();
    entity.addComponent('stub', comp);
    entity.updateComponents(16);
    expect(comp.updateCalls).toEqual([16]);
  });

  it('updateComponents skips disabled components', () => {
    const entity = new Entity(scene);
    const comp = new StubComponent();
    comp.enabled = false;
    entity.addComponent('stub', comp);
    entity.updateComponents(16);
    expect(comp.updateCalls).toEqual([]);
  });

  // ── destroy ───────────────────────────────────────────────────────

  it('destroy calls onDetach on all components and clears them', () => {
    const entity = new Entity(scene);
    const comp1 = new StubComponent();
    const comp2 = new StubComponent();
    entity.addComponent('a', comp1);
    entity.addComponent('b', comp2);
    entity.destroy();
    expect(comp1.detachCalled).toBe(true);
    expect(comp2.detachCalled).toBe(true);
    expect(entity.hasComponent('a')).toBe(false);
    expect(entity.hasComponent('b')).toBe(false);
  });

  // ── getDebugState ─────────────────────────────────────────────────

  it('getDebugState returns expected shape', () => {
    const entity = new Entity(scene, 5, 10);
    entity.entityType = 'npc';
    entity.addComponent('stub', new StubComponent());
    entity.addTag('friendly');
    const state = entity.getDebugState();
    expect(state.type).toBe('npc');
    expect(state.components).toEqual(['stub']);
    expect(state.tags).toEqual(['friendly']);
  });
});
