import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    console: vi.fn(),
    engine: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    playtest: vi.fn(),
    addErrorListener: vi.fn(),
    removeErrorListener: vi.fn(),
  },
}));

vi.mock('../../src/debug/Profiler', () => ({
  profiler: {
    getAverageFrameTime: vi.fn(() => 16.6),
    getTimingSummary: vi.fn(() => ({})),
  },
}));

// Mock Entity to avoid Phaser dependency
vi.mock('../../src/entity/Entity', () => ({
  Entity: vi.fn().mockImplementation((_scene: unknown, x: number, y: number) => ({
    x,
    y,
    addTag: vi.fn(),
    getTags: vi.fn(() => new Set()),
  })),
}));

import { registerBuiltinCommands } from '../../src/debug/DebugConsoleCommands';

// Minimal mock for DebugConsole API
function makeConsoleMock() {
  const commands = new Map<string, { handler: (args: string, out: unknown) => void; description: string }>();
  return {
    register: vi.fn((name: string, handler: unknown, description: string) => {
      commands.set(name.toLowerCase(), { handler: handler as (args: string, out: unknown) => void, description });
    }),
    getCommands: vi.fn(() => commands),
    getActiveGameScene: vi.fn(() => null),
    clear: vi.fn(),
    _commands: commands,
  };
}

function makeOutMock() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function makeGameMock() {
  const registryStore = new Map<string, unknown>();
  return {
    loop: { actualFps: 60, timeScale: 1 },
    scene: {
      getScenes: vi.fn(() => []),
      getScene: vi.fn(() => null),
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    },
    registry: {
      get: vi.fn((key: string) => registryStore.get(key)),
      set: vi.fn((key: string, val: unknown) => registryStore.set(key, val)),
    },
  };
}

describe('DebugConsoleCommands', () => {
  let con: ReturnType<typeof makeConsoleMock>;
  let game: ReturnType<typeof makeGameMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    con = makeConsoleMock();
    game = makeGameMock();
    registerBuiltinCommands(con as never, game as never);
  });

  it('registers all 14 built-in commands', () => {
    expect(con.register).toHaveBeenCalledTimes(14);
    const names = [...con._commands.keys()];
    expect(names).toContain('help');
    expect(names).toContain('clear');
    expect(names).toContain('entities');
    expect(names).toContain('spawn');
    expect(names).toContain('kill');
    expect(names).toContain('set');
    expect(names).toContain('get');
    expect(names).toContain('scene');
    expect(names).toContain('timescale');
    expect(names).toContain('pause');
    expect(names).toContain('resume');
    expect(names).toContain('inspect');
    expect(names).toContain('fps');
    expect(names).toContain('playtest');
  });

  it('help lists all commands', () => {
    const out = makeOutMock();
    con._commands.get('help')!.handler('', out);
    // First call is "Available commands:", then one per command
    expect(out.log).toHaveBeenCalledWith('Available commands:');
    expect(out.log.mock.calls.length).toBeGreaterThanOrEqual(15); // header + 14 commands
  });

  it('help shows details for a specific command', () => {
    const out = makeOutMock();
    con._commands.get('help')!.handler('fps', out);
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining('fps'));
  });

  it('clear calls console.clear()', () => {
    const out = makeOutMock();
    con._commands.get('clear')!.handler('', out);
    expect(con.clear).toHaveBeenCalled();
  });

  it('entities warns when no active scene', () => {
    const out = makeOutMock();
    con._commands.get('entities')!.handler('', out);
    expect(out.warn).toHaveBeenCalledWith('No active game scene');
  });

  it('fps shows FPS info', () => {
    const out = makeOutMock();
    con._commands.get('fps')!.handler('', out);
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining('FPS: 60'));
  });

  it('set stores value in game registry', () => {
    const out = makeOutMock();
    con._commands.get('set')!.handler('score 42', out);
    expect(game.registry.set).toHaveBeenCalledWith('score', 42);
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining('42'));
  });

  it('set parses booleans', () => {
    const out = makeOutMock();
    con._commands.get('set')!.handler('godMode true', out);
    expect(game.registry.set).toHaveBeenCalledWith('godMode', true);
  });

  it('get reads value from game registry', () => {
    game.registry.get.mockReturnValueOnce(100);
    const out = makeOutMock();
    con._commands.get('get')!.handler('score', out);
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining('100'));
  });

  it('get warns on undefined key', () => {
    const out = makeOutMock();
    con._commands.get('get')!.handler('missing', out);
    expect(out.warn).toHaveBeenCalledWith(expect.stringContaining('undefined'));
  });

  it('scene list shows scenes', () => {
    game.scene.getScenes
      .mockReturnValueOnce([{ scene: { key: 'MenuScene' } }, { scene: { key: 'GameScene' } }])
      .mockReturnValueOnce([{ scene: { key: 'GameScene' } }]);
    const out = makeOutMock();
    con._commands.get('scene')!.handler('list', out);
    expect(out.log).toHaveBeenCalledWith('Scenes:');
  });

  it('timescale shows current when no arg', () => {
    const out = makeOutMock();
    con._commands.get('timescale')!.handler('', out);
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining('Current timescale'));
  });

  it('timescale sets game loop timeScale', () => {
    const out = makeOutMock();
    con._commands.get('timescale')!.handler('0.5', out);
    expect(game.loop.timeScale).toBe(0.5);
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining('0.5'));
  });

  it('pause warns when no active scene', () => {
    const out = makeOutMock();
    con._commands.get('pause')!.handler('', out);
    expect(out.warn).toHaveBeenCalledWith('No active game scene');
  });

  it('spawn errors without type argument', () => {
    con.getActiveGameScene.mockReturnValue({
      cameras: { main: { centerX: 400, centerY: 300 } },
      add: { existing: vi.fn() },
      entities: { register: vi.fn() },
    });
    const out = makeOutMock();
    con._commands.get('spawn')!.handler('', out);
    expect(out.error).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });

  it('kill errors without argument', () => {
    con.getActiveGameScene.mockReturnValue({
      getEntityRegistry: vi.fn(() => ({ count: 0, clear: vi.fn(), getByTag: vi.fn(() => []), getAll: vi.fn(() => []) })),
    });
    const out = makeOutMock();
    con._commands.get('kill')!.handler('', out);
    expect(out.error).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });

  it('playtest warns when no reporter registered', () => {
    const out = makeOutMock();
    con._commands.get('playtest')!.handler('', out);
    expect(out.warn).toHaveBeenCalledWith(expect.stringContaining('PlaytestReporter'));
  });
});
