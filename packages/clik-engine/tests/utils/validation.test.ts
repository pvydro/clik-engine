import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validatePositiveNumber,
  validateNonNegativeNumber,
  validateNonEmptyString,
  validateEnum,
  validateHexColor,
  validatePositiveInt,
} from '../../src/utils/validation';

// Mock ConsoleReporter
vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    error: vi.fn(),
  },
}));

import { ConsoleReporter } from '../../src/debug/ConsoleReporter';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validatePositiveNumber', () => {
  it('accepts valid positive numbers', () => {
    expect(validatePositiveNumber(1, 'x', 'test')).toBe(true);
    expect(validatePositiveNumber(0.5, 'x', 'test')).toBe(true);
    expect(validatePositiveNumber(1000, 'x', 'test')).toBe(true);
    expect(ConsoleReporter.error).not.toHaveBeenCalled();
  });

  it('rejects zero', () => {
    expect(validatePositiveNumber(0, 'x', 'test')).toBe(false);
    expect(ConsoleReporter.error).toHaveBeenCalled();
  });

  it('rejects negative', () => {
    expect(validatePositiveNumber(-1, 'x', 'test')).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validatePositiveNumber(NaN, 'x', 'test')).toBe(false);
  });

  it('rejects Infinity', () => {
    expect(validatePositiveNumber(Infinity, 'x', 'test')).toBe(false);
  });
});

describe('validateNonNegativeNumber', () => {
  it('accepts zero and positive', () => {
    expect(validateNonNegativeNumber(0, 'x', 'test')).toBe(true);
    expect(validateNonNegativeNumber(5, 'x', 'test')).toBe(true);
  });

  it('rejects negative', () => {
    expect(validateNonNegativeNumber(-1, 'x', 'test')).toBe(false);
  });
});

describe('validateNonEmptyString', () => {
  it('accepts non-empty strings', () => {
    expect(validateNonEmptyString('hello', 'name', 'test')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateNonEmptyString('', 'name', 'test')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(validateNonEmptyString('   ', 'name', 'test')).toBe(false);
  });
});

describe('validateEnum', () => {
  const allowed = ['a', 'b', 'c'] as const;

  it('accepts valid values', () => {
    expect(validateEnum('a', allowed, 'val', 'test')).toBe(true);
    expect(validateEnum('b', allowed, 'val', 'test')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(validateEnum('d' as 'a', allowed, 'val', 'test')).toBe(false);
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("must be one of [a, b, c]"),
      expect.any(String)
    );
  });
});

describe('validateHexColor', () => {
  it('accepts valid hex colors', () => {
    expect(validateHexColor('#000000', 'color', 'test')).toBe(true);
    expect(validateHexColor('#fff', 'color', 'test')).toBe(true);
    expect(validateHexColor('#FF00FF', 'color', 'test')).toBe(true);
    expect(validateHexColor('#00000080', 'color', 'test')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(validateHexColor('red', 'color', 'test')).toBe(false);
    expect(validateHexColor('000000', 'color', 'test')).toBe(false);
    expect(validateHexColor('#GGGGGG', 'color', 'test')).toBe(false);
    expect(validateHexColor('#12345', 'color', 'test')).toBe(false);
  });
});

describe('validatePositiveInt', () => {
  it('accepts positive integers', () => {
    expect(validatePositiveInt(1, 'n', 'test')).toBe(true);
    expect(validatePositiveInt(100, 'n', 'test')).toBe(true);
  });

  it('rejects zero', () => {
    expect(validatePositiveInt(0, 'n', 'test')).toBe(false);
  });

  it('rejects floats', () => {
    expect(validatePositiveInt(1.5, 'n', 'test')).toBe(false);
  });

  it('rejects negative', () => {
    expect(validatePositiveInt(-1, 'n', 'test')).toBe(false);
  });
});
