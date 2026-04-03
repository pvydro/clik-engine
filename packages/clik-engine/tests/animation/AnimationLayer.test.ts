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

function makeMockSprite() {
  return {
    anims: { isPlaying: false },
    play: vi.fn().mockImplementation(function(this: { anims: { isPlaying: boolean } }) {
      this.anims.isPlaying = true;
    }),
    stop: vi.fn().mockImplementation(function(this: { anims: { isPlaying: boolean } }) {
      this.anims.isPlaying = false;
    }),
    setAlpha: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

import { AnimationLayerStack } from '../../src/animation/AnimationLayer';

describe('AnimationLayerStack', () => {
  it('adds and removes layers', () => {
    const stack = new AnimationLayerStack();
    const sprite = makeMockSprite();
    stack.addLayer({ name: 'legs', sprite: sprite as any });
    expect(stack.getLayerNames()).toContain('legs');

    stack.removeLayer('legs');
    expect(stack.getLayerNames()).not.toContain('legs');
  });

  it('plays animation on a layer', () => {
    const stack = new AnimationLayerStack();
    const sprite = makeMockSprite();
    stack.addLayer({ name: 'body', sprite: sprite as any });

    stack.play('body', 'run');
    expect(sprite.play).toHaveBeenCalledWith('run', true);
    expect(stack.getCurrentAnim('body')).toBe('run');
  });

  it('stops animation on a layer', () => {
    const stack = new AnimationLayerStack();
    const sprite = makeMockSprite();
    stack.addLayer({ name: 'body', sprite: sprite as any });

    stack.play('body', 'run');
    stack.stop('body');
    expect(sprite.stop).toHaveBeenCalled();
    expect(stack.getCurrentAnim('body')).toBeNull();
  });

  it('sets and gets weight', () => {
    const stack = new AnimationLayerStack();
    const sprite = makeMockSprite();
    stack.addLayer({ name: 'arms', sprite: sprite as any, weight: 0.5 });

    expect(stack.getWeight('arms')).toBe(0.5);

    stack.setWeight('arms', 0.8);
    expect(stack.getWeight('arms')).toBe(0.8);
    expect(sprite.setAlpha).toHaveBeenCalledWith(0.8);
  });

  it('clamps weight to 0-1', () => {
    const stack = new AnimationLayerStack();
    const sprite = makeMockSprite();
    stack.addLayer({ name: 'test', sprite: sprite as any });

    stack.setWeight('test', 2);
    expect(stack.getWeight('test')).toBe(1);

    stack.setWeight('test', -1);
    expect(stack.getWeight('test')).toBe(0);
  });

  it('getBlendMode returns configured mode', () => {
    const stack = new AnimationLayerStack();
    const sprite = makeMockSprite();
    stack.addLayer({ name: 'a', sprite: sprite as any, blendMode: 'additive' });
    expect(stack.getBlendMode('a')).toBe('additive');
  });

  it('defaults to override blend mode', () => {
    const stack = new AnimationLayerStack();
    const sprite = makeMockSprite();
    stack.addLayer({ name: 'a', sprite: sprite as any });
    expect(stack.getBlendMode('a')).toBe('override');
  });

  it('stopAll stops all layers', () => {
    const stack = new AnimationLayerStack();
    const s1 = makeMockSprite();
    const s2 = makeMockSprite();
    stack.addLayer({ name: 'legs', sprite: s1 as any });
    stack.addLayer({ name: 'torso', sprite: s2 as any });
    stack.play('legs', 'run');
    stack.play('torso', 'aim');

    stack.stopAll();
    expect(s1.stop).toHaveBeenCalled();
    expect(s2.stop).toHaveBeenCalled();
  });

  it('returns 0 weight for unknown layer', () => {
    const stack = new AnimationLayerStack();
    expect(stack.getWeight('nonexistent')).toBe(0);
  });

  it('returns null anim for unknown layer', () => {
    const stack = new AnimationLayerStack();
    expect(stack.getCurrentAnim('nonexistent')).toBeNull();
  });

  it('destroy clears everything', () => {
    const stack = new AnimationLayerStack();
    const sprite = makeMockSprite();
    stack.addLayer({ name: 'a', sprite: sprite as any });
    stack.destroy();
    expect(stack.getLayerNames()).toHaveLength(0);
  });
});
