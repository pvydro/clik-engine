import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Animations: {
      Events: {
        ANIMATION_UPDATE: 'ANIMATION_UPDATE',
        ANIMATION_COMPLETE: 'ANIMATION_COMPLETE',
      },
    },
  },
}));

import { AIAnimationAdapter } from '../../src/ai/AIAnimationAdapter';
import { AnimationStateMachine } from '../../src/animation/AnimationStateMachine';

function makeSprite() {
  return {
    anims: { isPlaying: true },
    play: vi.fn(),
    stop: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  };
}

describe('AIAnimationAdapter', () => {
  function setup() {
    const sprite = makeSprite();
    const asm = new AnimationStateMachine(sprite as any);
    asm.addState('idle', { animKey: 'idle', loop: true });
    asm.addState('walk', { animKey: 'walk', loop: true });
    asm.addState('attack', { animKey: 'attack', loop: false });
    asm.start('idle');

    const adapter = new AIAnimationAdapter(asm);
    adapter.map('patrol', 'walk');
    adapter.map('idle', 'idle');
    adapter.map('attack', 'attack');
    return { asm, adapter };
  }

  it('maps AI state to animation state', () => {
    const { asm, adapter } = setup();
    adapter.setAIState('patrol');
    expect(asm.getCurrent()).toBe('walk');
  });

  it('returns false for same state', () => {
    const { adapter } = setup();
    adapter.setAIState('idle');
    expect(adapter.setAIState('idle')).toBe(false);
  });

  it('returns false for unmapped state', () => {
    const { adapter } = setup();
    expect(adapter.setAIState('unknown')).toBe(false);
  });

  it('getAnimForAIState returns mapped anim', () => {
    const { adapter } = setup();
    expect(adapter.getAnimForAIState('patrol')).toBe('walk');
    expect(adapter.getAnimForAIState('unknown')).toBeUndefined();
  });

  it('getCurrentAIState tracks state', () => {
    const { adapter } = setup();
    expect(adapter.getCurrentAIState()).toBeNull();
    adapter.setAIState('patrol');
    expect(adapter.getCurrentAIState()).toBe('patrol');
  });

  it('mapAll adds multiple mappings', () => {
    const { adapter } = setup();
    adapter.mapAll([
      { aiState: 'flee', animState: 'walk' },
      { aiState: 'die', animState: 'idle' },
    ]);
    expect(adapter.getAnimForAIState('flee')).toBe('walk');
    expect(adapter.getAnimForAIState('die')).toBe('idle');
  });

  it('getMappings returns all entries', () => {
    const { adapter } = setup();
    const mappings = adapter.getMappings();
    expect(mappings.length).toBe(3);
  });

  it('velocity blend callback works', () => {
    const { asm, adapter } = setup();
    adapter.setVelocityBlend((vx, vy) => {
      const speed = Math.sqrt(vx * vx + vy * vy);
      return speed > 50 ? 'walk' : 'idle';
    });

    adapter.updateFromVelocity(100, 0);
    expect(asm.getCurrent()).toBe('walk');
  });

  it('updateFromVelocity returns false without callback', () => {
    const { adapter } = setup();
    expect(adapter.updateFromVelocity(100, 0)).toBe(false);
  });

  it('clear removes all state', () => {
    const { adapter } = setup();
    adapter.setAIState('patrol');
    adapter.clear();
    expect(adapter.getCurrentAIState()).toBeNull();
    expect(adapter.getMappings()).toHaveLength(0);
  });
});
