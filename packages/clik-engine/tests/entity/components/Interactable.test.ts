import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Geom: {
      Rectangle: class Rectangle {
        x: number; y: number; width: number; height: number;
        constructor(x: number, y: number, w: number, h: number) { this.x = x; this.y = y; this.width = w; this.height = h; }
        static Contains = vi.fn(() => true);
      },
    },
  },
}));

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), log: vi.fn(), state: vi.fn() },
}));

import { Interactable } from '../../../src/entity/components/Interactable';
import { makeEntityMock } from '../../helpers/TestScene';

function makeInteractable(config?: { width?: number; height?: number; cursor?: boolean }) {
  const comp = new Interactable(config);
  const entity = makeEntityMock(0, 0);
  comp.entity = entity as never;
  return { comp, entity };
}

function getListener(entity: ReturnType<typeof makeEntityMock>, event: string) {
  const calls = (entity.on as ReturnType<typeof vi.fn>).mock.calls;
  const match = calls.find((c: unknown[]) => c[0] === event);
  return match ? (match[1] as (...args: unknown[]) => void) : undefined;
}

describe('Interactable', () => {
  // ── onAttach ──────────────────────────────────────────────────────

  it('onAttach sets entity size and interactive', () => {
    const { comp, entity } = makeInteractable({ width: 64, height: 48 });
    comp.onAttach();
    expect(entity.setSize).toHaveBeenCalledWith(64, 48);
    expect(entity.setInteractive).toHaveBeenCalledWith(
      expect.objectContaining({ useHandCursor: true }),
    );
  });

  it('defaults to 32x32 when no config provided', () => {
    const { comp, entity } = makeInteractable();
    comp.onAttach();
    expect(entity.setSize).toHaveBeenCalledWith(32, 32);
  });

  it('registers pointerover, pointerout, pointerup listeners', () => {
    const { comp, entity } = makeInteractable();
    comp.onAttach();
    const events = (entity.on as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('pointerover');
    expect(events).toContain('pointerout');
    expect(events).toContain('pointerup');
  });

  // ── Callbacks ─────────────────────────────────────────────────────

  it('onClick callback fires on pointerup', () => {
    const { comp, entity } = makeInteractable();
    const cb = vi.fn();
    comp.onClick(cb);
    comp.onAttach();
    getListener(entity, 'pointerup')!();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('onHoverEnter fires on pointerover', () => {
    const { comp, entity } = makeInteractable();
    const cb = vi.fn();
    comp.onHoverEnter(cb);
    comp.onAttach();
    getListener(entity, 'pointerover')!();
    expect(cb).toHaveBeenCalledOnce();
    expect(comp.isHovered()).toBe(true);
  });

  it('onHoverExit fires on pointerout', () => {
    const { comp, entity } = makeInteractable();
    const cb = vi.fn();
    comp.onHoverExit(cb);
    comp.onAttach();
    getListener(entity, 'pointerover')!(); // enter first
    getListener(entity, 'pointerout')!();
    expect(cb).toHaveBeenCalledOnce();
    expect(comp.isHovered()).toBe(false);
  });

  // ── isInRange / tryInteract ───────────────────────────────────────

  it('isInRange returns false when no interact range set', () => {
    const { comp } = makeInteractable();
    comp.onAttach();
    const other = { x: 5, y: 5 } as Phaser.GameObjects.GameObject & { x: number; y: number };
    expect(comp.isInRange(other)).toBe(false);
  });

  it('isInRange returns true when object within range', () => {
    const { comp, entity } = makeInteractable();
    comp.onInteract(vi.fn(), 100);
    comp.onAttach();
    entity.x = 0;
    entity.y = 0;
    const other = { x: 50, y: 0 } as Phaser.GameObjects.GameObject & { x: number; y: number };
    expect(comp.isInRange(other)).toBe(true);
  });

  it('isInRange returns false when object out of range', () => {
    const { comp, entity } = makeInteractable();
    comp.onInteract(vi.fn(), 10);
    comp.onAttach();
    entity.x = 0;
    entity.y = 0;
    const other = { x: 100, y: 100 } as Phaser.GameObjects.GameObject & { x: number; y: number };
    expect(comp.isInRange(other)).toBe(false);
  });

  it('tryInteract fires callback when in range and returns true', () => {
    const { comp, entity } = makeInteractable();
    const cb = vi.fn();
    comp.onInteract(cb, 100);
    comp.onAttach();
    entity.x = 0;
    entity.y = 0;
    const other = { x: 10, y: 0 } as Phaser.GameObjects.GameObject & { x: number; y: number };
    expect(comp.tryInteract(other)).toBe(true);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('tryInteract returns false when out of range', () => {
    const { comp, entity } = makeInteractable();
    const cb = vi.fn();
    comp.onInteract(cb, 5);
    comp.onAttach();
    entity.x = 0;
    entity.y = 0;
    const other = { x: 100, y: 100 } as Phaser.GameObjects.GameObject & { x: number; y: number };
    expect(comp.tryInteract(other)).toBe(false);
    expect(cb).not.toHaveBeenCalled();
  });

  // ── onDetach ──────────────────────────────────────────────────────

  it('onDetach removes event listeners', () => {
    const { comp, entity } = makeInteractable();
    comp.onAttach();
    comp.onDetach();
    expect(entity.off).toHaveBeenCalledWith('pointerover');
    expect(entity.off).toHaveBeenCalledWith('pointerout');
    expect(entity.off).toHaveBeenCalledWith('pointerup');
  });

  // ── Chaining ──────────────────────────────────────────────────────

  it('onClick returns this for chaining', () => {
    const { comp } = makeInteractable();
    expect(comp.onClick(vi.fn())).toBe(comp);
  });

  it('onHoverEnter returns this for chaining', () => {
    const { comp } = makeInteractable();
    expect(comp.onHoverEnter(vi.fn())).toBe(comp);
  });

  it('onHoverExit returns this for chaining', () => {
    const { comp } = makeInteractable();
    expect(comp.onHoverExit(vi.fn())).toBe(comp);
  });

  it('onInteract returns this for chaining', () => {
    const { comp } = makeInteractable();
    expect(comp.onInteract(vi.fn(), 50)).toBe(comp);
  });
});
