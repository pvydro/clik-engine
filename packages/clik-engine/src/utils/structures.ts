/** 2D grid data structure */
export class Grid2D<T> {
  private data: T[];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number, defaultValue: T) {
    this.width = width;
    this.height = height;
    this.data = Array(width * height).fill(defaultValue);
  }

  get(x: number, y: number): T | undefined {
    if (!this.inBounds(x, y)) return undefined;
    return this.data[y * this.width + x];
  }

  set(x: number, y: number, value: T): void {
    if (!this.inBounds(x, y)) return;
    this.data[y * this.width + x] = value;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  fill(value: T): void {
    this.data.fill(value);
  }

  forEach(callback: (value: T, x: number, y: number) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        callback(this.data[y * this.width + x], x, y);
      }
    }
  }

  map<U>(callback: (value: T, x: number, y: number) => U, defaultValue: U): Grid2D<U> {
    const result = new Grid2D<U>(this.width, this.height, defaultValue);
    this.forEach((v, x, y) => result.set(x, y, callback(v, x, y)));
    return result;
  }

  getNeighbors(x: number, y: number, diagonal = false): { x: number; y: number; value: T }[] {
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
    ];
    if (diagonal) {
      dirs.push({ dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 });
    }

    return dirs
      .map(d => ({ x: x + d.dx, y: y + d.dy }))
      .filter(p => this.inBounds(p.x, p.y))
      .map(p => ({ ...p, value: this.get(p.x, p.y)! }));
  }

  find(predicate: (value: T, x: number, y: number) => boolean): { x: number; y: number; value: T } | undefined {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const v = this.data[y * this.width + x];
        if (predicate(v, x, y)) return { x, y, value: v };
      }
    }
    return undefined;
  }

  findAll(predicate: (value: T, x: number, y: number) => boolean): { x: number; y: number; value: T }[] {
    const results: { x: number; y: number; value: T }[] = [];
    this.forEach((v, x, y) => {
      if (predicate(v, x, y)) results.push({ x, y, value: v });
    });
    return results;
  }

  clone(): Grid2D<T> {
    const copy = new Grid2D<T>(this.width, this.height, this.data[0]);
    copy.data = [...this.data];
    return copy;
  }

  toArray(): T[][] {
    const result: T[][] = [];
    for (let y = 0; y < this.height; y++) {
      result.push(this.data.slice(y * this.width, (y + 1) * this.width));
    }
    return result;
  }
}

/** Priority queue (min-heap) — useful for pathfinding */
export class PriorityQueue<T> {
  private heap: { item: T; priority: number }[] = [];

  get size(): number { return this.heap.length; }
  get isEmpty(): boolean { return this.heap.length === 0; }

  enqueue(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.isEmpty) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top.item;
  }

  peek(): T | undefined {
    return this.heap[0]?.item;
  }

  clear(): void {
    this.heap = [];
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].priority <= this.heap[idx].priority) break;
      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }

  private sinkDown(idx: number): void {
    const length = this.heap.length;
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === idx) break;
      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}
