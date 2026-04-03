import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComboGraph } from '../../src/animation/ComboGraph';
import { InputBuffer } from '../../src/input/InputBuffer';
import { CancelWindow } from '../../src/animation/CancelWindow';

describe('ComboGraph', () => {
  let graph: ComboGraph;
  let buffer: InputBuffer;

  beforeEach(() => {
    graph = new ComboGraph();
    buffer = new InputBuffer(500);

    graph.addEdge('idle', { to: 'attack1', input: ['attack'], priority: 1 });
    graph.addEdge('attack1', { to: 'attack2', input: ['attack'], priority: 1 });
    graph.addEdge('attack1', { to: 'special', input: ['down', 'attack'], priority: 2 });
    graph.addEdge('idle', { to: 'dodge', input: ['dodge'], priority: 1 });
  });

  it('matches simple single-input edge', () => {
    buffer.record('attack');
    expect(graph.evaluate('idle', buffer)).toBe('attack1');
  });

  it('returns null when no input matches', () => {
    expect(graph.evaluate('idle', buffer)).toBeNull();
  });

  it('returns null for state with no edges', () => {
    expect(graph.evaluate('dodge', buffer)).toBeNull();
  });

  it('chains combos', () => {
    buffer.record('attack');
    expect(graph.evaluate('idle', buffer)).toBe('attack1');

    buffer.clear();
    buffer.record('attack');
    expect(graph.evaluate('attack1', buffer)).toBe('attack2');
  });

  it('prefers higher priority edge when multiple match', () => {
    buffer.record('down');
    buffer.record('attack');
    // Both 'attack2' (input: ['attack']) and 'special' (input: ['down', 'attack']) match
    // 'special' has priority 2 vs 'attack2' priority 1
    expect(graph.evaluate('attack1', buffer)).toBe('special');
  });

  it('respects cancel window when provided', () => {
    const cw = new CancelWindow();
    cw.define('attack1', { start: 4, end: 10, into: ['attack2', 'special'] });

    buffer.record('attack');

    // Frame 2: before cancel window
    expect(graph.evaluate('attack1', buffer, 2, cw)).toBeNull();

    // Frame 5: in cancel window
    expect(graph.evaluate('attack1', buffer, 5, cw)).toBe('attack2');
  });

  it('getEdges returns edges for a state', () => {
    expect(graph.getEdges('idle')).toHaveLength(2);
    expect(graph.getEdges('attack1')).toHaveLength(2);
    expect(graph.getEdges('unknown')).toEqual([]);
  });

  it('getStates returns all states with edges', () => {
    const states = graph.getStates();
    expect(states).toContain('idle');
    expect(states).toContain('attack1');
  });

  it('addEdges adds multiple at once', () => {
    graph.addEdges('dodge', [
      { to: 'attack1', input: ['attack'] },
      { to: 'idle', input: ['dodge'] },
    ]);
    expect(graph.getEdges('dodge')).toHaveLength(2);
  });

  it('clear removes all edges', () => {
    graph.clear();
    buffer.record('attack');
    expect(graph.evaluate('idle', buffer)).toBeNull();
  });
});
