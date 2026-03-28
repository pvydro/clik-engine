import { describe, it, expect } from 'vitest';
import { SaveMigrator } from '../../src/save/migration';

describe('SaveMigrator', () => {
  it('migrates through versions', () => {
    const migrator = new SaveMigrator()
      .register(1, (data) => ({ ...data, newField: 'added in v2' }))
      .register(2, (data) => {
        const { oldField, ...rest } = data as Record<string, unknown> & { oldField?: unknown };
        return { ...rest, renamedField: oldField ?? 'default' };
      });

    const result = migrator.migrate({ oldField: 'hello', score: 100 }, 1, 3);
    expect(result).toEqual({
      score: 100,
      newField: 'added in v2',
      renamedField: 'hello',
    });
  });

  it('does nothing when already at target version', () => {
    const migrator = new SaveMigrator()
      .register(1, (data) => ({ ...data, extra: true }));

    const result = migrator.migrate({ score: 50 }, 2, 2);
    expect(result).toEqual({ score: 50 });
  });

  it('handles single version jump', () => {
    const migrator = new SaveMigrator()
      .register(1, (data) => ({ ...data, migrated: true }));

    const result = migrator.migrate({ score: 10 }, 1, 2);
    expect(result).toEqual({ score: 10, migrated: true });
  });

  it('skips missing migration functions', () => {
    const migrator = new SaveMigrator()
      .register(3, (data) => ({ ...data, v4: true }));

    // Migrate 1→4, but only v3→v4 migration exists
    const result = migrator.migrate({ score: 5 }, 1, 4);
    expect(result).toEqual({ score: 5, v4: true });
  });
});
