import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), log: vi.fn(), state: vi.fn() },
}));

import { DragDrop } from '../../../src/entity/components/DragDrop';
import { makeEntityMock } from '../../helpers/TestScene';

function makeDragDrop(snapBack = true) {
  const dd = new DragDrop(snapBack);
  const entity = makeEntityMock(100, 200);
  dd.entity = entity as never;
  return { dd, entity };
}

/** Simulate Phaser events by capturing listeners registered via entity.on */
function getListener(entity: ReturnType<typeof makeEntityMock>, event: string) {
  const calls = (entity.on as ReturnType<typeof vi.fn>).mock.calls;
  const match = calls.find((c: unknown[]) => c[0] === event);
  return match ? (match[1] as (...args: unknown[]) => void) : undefined;
}

describe('DragDrop', () => {
  it('onAttach sets interactive and draggable on entity', () => {
    const { dd, entity } = makeDragDrop();
    dd.onAttach();
    expect(entity.setInteractive).toHaveBeenCalledWith(
      expect.objectContaining({ draggable: true, useHandCursor: true }),
    );
  });

  it('onAttach calls scene.input.setDraggable', () => {
    const { dd, entity } = makeDragDrop();
    dd.onAttach();
    expect(entity.scene.input.setDraggable).toHaveBeenCalledWith(entity);
  });

  it('registers dragstart, drag, and dragend listeners', () => {
    const { dd, entity } = makeDragDrop();
    dd.onAttach();
    const events = (entity.on as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('dragstart');
    expect(events).toContain('drag');
    expect(events).toContain('dragend');
  });

  it('dragstart sets isDragging true and stores original position', () => {
    const { dd, entity } = makeDragDrop();
    entity.x = 50;
    entity.y = 75;
    dd.onAttach();
    const dragstart = getListener(entity, 'dragstart')!;
    dragstart({});
    expect(dd.getIsDragging()).toBe(true);
    expect(dd.getOriginalPosition()).toEqual({ x: 50, y: 75 });
  });

  it('drag updates entity position', () => {
    const { dd, entity } = makeDragDrop();
    dd.onAttach();
    const drag = getListener(entity, 'drag')!;
    drag({}, 300, 400);
    expect(entity.x).toBe(300);
    expect(entity.y).toBe(400);
  });

  it('dragend with accepted drop keeps new position', () => {
    const { dd, entity } = makeDragDrop();
    const dropCb = vi.fn(() => true);
    dd.onDrop(dropCb);
    dd.onAttach();

    // Start drag
    entity.x = 10;
    entity.y = 20;
    getListener(entity, 'dragstart')!({});
    // Move
    entity.x = 200;
    entity.y = 300;
    // End
    getListener(entity, 'dragend')!();

    expect(dropCb).toHaveBeenCalledWith(200, 300);
    expect(entity.x).toBe(200);
    expect(entity.y).toBe(300);
  });

  it('dragend snaps back when drop rejected and snapBackOnFail is true', () => {
    const { dd, entity } = makeDragDrop(true);
    dd.onDrop(() => false);
    dd.onAttach();

    entity.x = 10;
    entity.y = 20;
    getListener(entity, 'dragstart')!({});
    entity.x = 200;
    entity.y = 300;
    getListener(entity, 'dragend')!();

    expect(entity.x).toBe(10);
    expect(entity.y).toBe(20);
  });

  it('dragend does NOT snap back when snapBackOnFail is false', () => {
    const { dd, entity } = makeDragDrop(false);
    dd.onDrop(() => false);
    dd.onAttach();

    entity.x = 10;
    entity.y = 20;
    getListener(entity, 'dragstart')!({});
    entity.x = 200;
    entity.y = 300;
    getListener(entity, 'dragend')!();

    expect(entity.x).toBe(200);
    expect(entity.y).toBe(300);
  });

  it('onDragStart callback fires on dragstart', () => {
    const { dd, entity } = makeDragDrop();
    const cb = vi.fn();
    dd.onDragStart(cb);
    dd.onAttach();
    getListener(entity, 'dragstart')!({});
    expect(cb).toHaveBeenCalledOnce();
  });

  it('onDetach removes event listeners', () => {
    const { dd, entity } = makeDragDrop();
    dd.onAttach();
    dd.onDetach();
    expect(entity.off).toHaveBeenCalledWith('dragstart');
    expect(entity.off).toHaveBeenCalledWith('drag');
    expect(entity.off).toHaveBeenCalledWith('dragend');
  });
});
