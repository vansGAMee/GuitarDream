export class BoundedHistory<T> {
  private past: T[] = [];
  private future: T[] = [];
  private readonly maxDepth: number;

  constructor(maxDepth = 50) {
    this.maxDepth = maxDepth;
  }

  public push(current: T): void {
    // Clone snapshot
    const snapshot = JSON.parse(JSON.stringify(current));
    this.past.push(snapshot);
    if (this.past.length > this.maxDepth) {
      this.past.shift();
    }
    this.future = [];
  }

  public undo(current: T): T | null {
    if (this.past.length === 0) return null;
    const previous = this.past.pop()!;
    this.future.push(JSON.parse(JSON.stringify(current)));
    return previous;
  }

  public redo(current: T): T | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(JSON.parse(JSON.stringify(current)));
    return next;
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public clear(): void {
    this.past = [];
    this.future = [];
  }
}
