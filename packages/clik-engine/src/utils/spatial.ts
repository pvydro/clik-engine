/**
 * Spatial hash grid for efficient broad-phase collision detection.
 * Groups objects into grid cells for O(1) neighbor queries.
 */
export class SpatialHash<T> {
  private cellSize: number;
  private cells: Map<string, Set<T>> = new Map();
  private objectCells: Map<T, string[]> = new Map();

  constructor(cellSize = 64) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private cellCoords(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize),
    };
  }

  /** Insert an object at a position (with optional size for multi-cell spanning) */
  insert(obj: T, x: number, y: number, width = 0, height = 0): void {
    this.remove(obj); // Remove old position

    const minCell = this.cellCoords(x, y);
    const maxCell = this.cellCoords(x + width, y + height);
    const keys: string[] = [];

    for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
      for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
        const k = this.key(cx, cy);
        if (!this.cells.has(k)) {
          this.cells.set(k, new Set());
        }
        this.cells.get(k)!.add(obj);
        keys.push(k);
      }
    }

    this.objectCells.set(obj, keys);
  }

  /** Remove an object from the hash */
  remove(obj: T): void {
    const keys = this.objectCells.get(obj);
    if (!keys) return;

    for (const k of keys) {
      const cell = this.cells.get(k);
      if (cell) {
        cell.delete(obj);
        if (cell.size === 0) this.cells.delete(k);
      }
    }
    this.objectCells.delete(obj);
  }

  /** Query all objects near a position (within the same and adjacent cells) */
  queryNear(x: number, y: number): Set<T> {
    const results = new Set<T>();
    const { cx, cy } = this.cellCoords(x, y);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.cells.get(this.key(cx + dx, cy + dy));
        if (cell) {
          for (const obj of cell) results.add(obj);
        }
      }
    }

    return results;
  }

  /** Query all objects within a rectangular region */
  queryRect(x: number, y: number, width: number, height: number): Set<T> {
    const results = new Set<T>();
    const minCell = this.cellCoords(x, y);
    const maxCell = this.cellCoords(x + width, y + height);

    for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
      for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (cell) {
          for (const obj of cell) results.add(obj);
        }
      }
    }

    return results;
  }

  /** Clear all objects */
  clear(): void {
    this.cells.clear();
    this.objectCells.clear();
  }

  /** Get total number of tracked objects */
  get size(): number {
    return this.objectCells.size;
  }

  /** Get number of active cells */
  get cellCount(): number {
    return this.cells.size;
  }
}
