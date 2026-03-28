export type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

export class SaveMigrator {
  private migrations: Map<number, MigrationFn> = new Map();

  register(fromVersion: number, fn: MigrationFn): this {
    this.migrations.set(fromVersion, fn);
    return this;
  }

  migrate(data: Record<string, unknown>, fromVersion: number, toVersion: number): Record<string, unknown> {
    let current = { ...data };
    for (let v = fromVersion; v < toVersion; v++) {
      const fn = this.migrations.get(v);
      if (fn) {
        current = fn(current);
      }
    }
    return current;
  }
}
