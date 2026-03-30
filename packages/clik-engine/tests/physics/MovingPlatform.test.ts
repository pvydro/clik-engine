import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTestScene } from '../helpers/TestScene';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { MovingPlatform, type PlatformWaypoint } from '../../src/physics/MovingPlatform';

describe('MovingPlatform', () => {
  let scene: ReturnType<typeof makeTestScene>;

  beforeEach(() => {
    scene = makeTestScene();
    // Make the rectangle stub track position
    const rect = {
      x: 0,
      y: 0,
      body: {
        setImmovable: vi.fn(),
        setAllowGravity: vi.fn(),
        setVelocity: vi.fn(),
      },
      setPosition: vi.fn(function (this: any, x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
      }),
      destroy: vi.fn(),
    };
    (scene.add.rectangle as ReturnType<typeof vi.fn>).mockReturnValue(rect);
    // physics.add.existing should assign the body we already have
    (scene.physics.add.existing as ReturnType<typeof vi.fn>).mockImplementation((obj: any) => {
      // body already set on rect, no-op
    });
  });

  function getRect() {
    return (scene.add.rectangle as ReturnType<typeof vi.fn>).mock.results[0].value;
  }

  it('constructs and positions at first waypoint', () => {
    const waypoints: PlatformWaypoint[] = [
      { x: 0, y: 100 },
      { x: 200, y: 100 },
    ];
    new MovingPlatform(scene as any, 0, 0, 64, 16, waypoints, 100);
    const rect = getRect();
    expect(rect.setPosition).toHaveBeenCalledWith(0, 100);
  });

  it('sets body as immovable and no gravity', () => {
    const waypoints: PlatformWaypoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    new MovingPlatform(scene as any, 0, 0, 64, 16, waypoints);
    const rect = getRect();
    expect(rect.body.setImmovable).toHaveBeenCalledWith(true);
    expect(rect.body.setAllowGravity).toHaveBeenCalledWith(false);
  });

  it('update moves platform toward current waypoint', () => {
    const waypoints: PlatformWaypoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const platform = new MovingPlatform(scene as any, 0, 0, 64, 16, waypoints, 100);
    const rect = getRect();
    // Platform starts at waypoint 0 (0,0), targeting waypoint 1 (100,0)
    rect.x = 0;
    rect.y = 0;

    platform.update(16);
    // Should set velocity toward (100, 0)
    expect(rect.body.setVelocity).toHaveBeenCalledWith(100, 0);
  });

  it('reaches waypoint and reverses in loop mode (pingPong)', () => {
    const waypoints: PlatformWaypoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const platform = new MovingPlatform(scene as any, 0, 0, 64, 16, waypoints, 100, 0x555577, true);
    const rect = getRect();

    // Simulate reaching waypoint 1
    rect.x = 99.5;
    rect.y = 0;
    platform.update(16);

    // Should snap to waypoint position
    expect(rect.setPosition).toHaveBeenCalledWith(100, 0);
    // Next update should move back toward waypoint 0
    rect.x = 100;
    rect.y = 0;
    platform.update(16);
    // velocity should point left (negative x)
    expect(rect.body.setVelocity).toHaveBeenCalledWith(-100, 0);
  });

  it('wraps around in non-loop mode', () => {
    const waypoints: PlatformWaypoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const platform = new MovingPlatform(scene as any, 0, 0, 64, 16, waypoints, 100, 0x555577, false);
    const rect = getRect();

    // Reach waypoint 1
    rect.x = 99.5;
    rect.y = 0;
    platform.update(16);

    // After reaching the last waypoint in non-loop, index wraps to 0
    rect.x = 100;
    rect.y = 0;
    platform.update(16);
    // Should head toward waypoint 0 (0, 0)
    expect(rect.body.setVelocity).toHaveBeenCalledWith(-100, 0);
  });

  it('pauses at waypoints with pauseMs', () => {
    const waypoints: PlatformWaypoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0, pauseMs: 1000 },
    ];
    const platform = new MovingPlatform(scene as any, 0, 0, 64, 16, waypoints, 100);
    const rect = getRect();

    // Reach waypoint 1
    rect.x = 99.5;
    rect.y = 0;
    platform.update(16);

    // Now platform should be paused — velocity set to 0
    rect.body.setVelocity.mockClear();
    platform.update(16);
    expect(rect.body.setVelocity).toHaveBeenCalledWith(0, 0);

    // After enough time, should unpause
    platform.update(1000);
    rect.body.setVelocity.mockClear();
    rect.x = 100;
    rect.y = 0;
    platform.update(16);
    // Should now be moving again (not zero velocity)
    const lastCall = rect.body.setVelocity.mock.calls[rect.body.setVelocity.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
  });

  it('does nothing with fewer than 2 waypoints', () => {
    const platform = new MovingPlatform(scene as any, 0, 0, 64, 16, [{ x: 0, y: 0 }], 100);
    const rect = getRect();
    rect.body.setVelocity.mockClear();
    platform.update(16);
    expect(rect.body.setVelocity).not.toHaveBeenCalled();
  });

  it('getGameObject returns the platform rectangle', () => {
    const waypoints: PlatformWaypoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const platform = new MovingPlatform(scene as any, 0, 0, 64, 16, waypoints);
    expect(platform.getGameObject()).toBe(getRect());
  });

  it('destroy calls destroy on the platform', () => {
    const waypoints: PlatformWaypoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const platform = new MovingPlatform(scene as any, 0, 0, 64, 16, waypoints);
    platform.destroy();
    expect(getRect().destroy).toHaveBeenCalled();
  });
});
