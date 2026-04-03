import { describe, it, expect } from 'vitest';
import { RollbackManager } from '../../src/network/Rollback';

interface TestState { x: number; y: number }
interface TestInput { dx: number; dy: number }

function makeRollback() {
  return new RollbackManager<TestState, TestInput>({
    maxRollbackFrames: 8,
    serialize: s => ({ ...s }),
    simulate: (s, inputs) => {
      let dx = 0, dy = 0;
      for (const input of inputs.values()) {
        dx += input.dx;
        dy += input.dy;
      }
      return { x: s.x + dx, y: s.y + dy };
    },
  });
}

describe('RollbackManager', () => {
  it('saves and retrieves frame snapshots', () => {
    const rb = makeRollback();
    rb.saveFrame(0, { x: 0, y: 0 });
    expect(rb.snapshotCount).toBe(1);
  });

  it('returns no rollback when no late inputs', () => {
    const rb = makeRollback();
    rb.saveFrame(0, { x: 0, y: 0 });
    const result = rb.rollbackIfNeeded(1);
    expect(result.rolledBack).toBe(false);
  });

  it('rolls back and re-simulates on late input', () => {
    const rb = makeRollback();
    const initialState = { x: 0, y: 0 };

    rb.saveFrame(0, initialState);
    rb.addLocalInput(0, { dx: 1, dy: 0 }, 0);
    rb.saveFrame(1, { x: 1, y: 0 });

    // Late remote input arrives for frame 0
    rb.addRemoteInput(0, { dx: 0, dy: 2 }, 1);

    const result = rb.rollbackIfNeeded(2);
    expect(result.rolledBack).toBe(true);
    expect(result.frameCount).toBe(2);
    // State should include both local and remote input
    expect(result.state!.x).toBe(1); // local dx=1
    expect(result.state!.y).toBe(2); // remote dy=2
  });

  it('tracks total rollback count', () => {
    const rb = makeRollback();
    rb.saveFrame(0, { x: 0, y: 0 });
    rb.addRemoteInput(0, { dx: 1, dy: 0 }, 1);
    rb.rollbackIfNeeded(1);
    expect(rb.totalRollbacks).toBe(1);
  });

  it('trims old snapshots', () => {
    const rb = makeRollback();
    for (let i = 0; i < 30; i++) {
      rb.saveFrame(i, { x: i, y: 0 });
    }
    // Should have trimmed old frames
    expect(rb.snapshotCount).toBeLessThan(30);
  });

  it('clear resets everything', () => {
    const rb = makeRollback();
    rb.saveFrame(0, { x: 0, y: 0 });
    rb.clear();
    expect(rb.snapshotCount).toBe(0);
    expect(rb.totalRollbacks).toBe(0);
  });
});
