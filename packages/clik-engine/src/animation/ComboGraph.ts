import type { InputBuffer } from '../input/InputBuffer';
import type { CancelWindow } from './CancelWindow';

export interface ComboEdge {
  /** Target state */
  to: string;
  /** Required input sequence (checked against InputBuffer) */
  input: string[];
  /** Priority when multiple edges match (higher = preferred) */
  priority?: number;
}

/**
 * Directed graph of combat moves with input requirements on edges.
 * Works with InputBuffer for buffered input reading and CancelWindow for timing.
 *
 * Usage:
 * ```
 * const graph = new ComboGraph();
 * graph.addEdge('idle', { to: 'attack1', input: ['attack'], priority: 1 });
 * graph.addEdge('attack1', { to: 'attack2', input: ['attack'], priority: 1 });
 * graph.addEdge('attack1', { to: 'special', input: ['down', 'attack'], priority: 2 });
 *
 * const next = graph.evaluate('attack1', inputBuffer, 10, cancelWindow);
 * ```
 */
export class ComboGraph {
  private edges: Map<string, ComboEdge[]> = new Map();

  /** Add an edge from a state */
  addEdge(from: string, edge: ComboEdge): this {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }
    this.edges.get(from)!.push({ priority: 0, ...edge });
    return this;
  }

  /** Add multiple edges from a state */
  addEdges(from: string, edges: ComboEdge[]): this {
    for (const edge of edges) {
      this.addEdge(from, edge);
    }
    return this;
  }

  /**
   * Evaluate the graph: given current state and input buffer, find the best matching edge.
   * If cancelWindow is provided, also checks that the cancel is allowed at currentFrame.
   *
   * @returns The target state name, or null if no valid transition found
   */
  evaluate(
    currentState: string,
    inputBuffer: InputBuffer,
    currentFrame?: number,
    cancelWindow?: CancelWindow,
  ): string | null {
    const edges = this.edges.get(currentState);
    if (!edges) return null;

    // Find all matching edges
    const matches: ComboEdge[] = [];
    for (const edge of edges) {
      // Check input sequence
      if (!inputBuffer.matchSequence(edge.input)) continue;

      // Check cancel window if provided
      if (cancelWindow && currentFrame !== undefined) {
        if (!cancelWindow.canCancel(currentState, edge.to, currentFrame)) continue;
      }

      matches.push(edge);
    }

    if (matches.length === 0) return null;

    // Return highest priority match (longer input sequences break ties)
    matches.sort((a, b) => {
      if (b.priority! !== a.priority!) return b.priority! - a.priority!;
      return b.input.length - a.input.length;
    });

    return matches[0].to;
  }

  /** Get all edges from a state */
  getEdges(from: string): readonly ComboEdge[] {
    return this.edges.get(from) ?? [];
  }

  /** Get all states that have outgoing edges */
  getStates(): string[] {
    return Array.from(this.edges.keys());
  }

  /** Clear all edges */
  clear(): void {
    this.edges.clear();
  }
}
