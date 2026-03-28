import { describe, it, expect } from 'vitest';
import { formatNumber, formatCompact, formatTime, formatTimePrecise, truncate, pluralize, ordinal } from '../../src/utils/format';

describe('formatNumber', () => {
  it('adds commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatCompact', () => {
  it('formats thousands', () => {
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(10000)).toBe('10.0K');
  });

  it('formats millions', () => {
    expect(formatCompact(1200000)).toBe('1.2M');
  });

  it('leaves small numbers alone', () => {
    expect(formatCompact(999)).toBe('999');
  });
});

describe('formatTime', () => {
  it('formats mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5000)).toBe('0:05');
    expect(formatTime(65000)).toBe('1:05');
    expect(formatTime(600000)).toBe('10:00');
  });
});

describe('formatTimePrecise', () => {
  it('formats mm:ss.ms', () => {
    expect(formatTimePrecise(1234)).toBe('0:01.234');
    expect(formatTimePrecise(65432)).toBe('1:05.432');
  });
});

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('leaves short strings alone', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });
});

describe('pluralize', () => {
  it('returns singular for 1', () => {
    expect(pluralize(1, 'coin')).toBe('coin');
  });

  it('returns plural for other counts', () => {
    expect(pluralize(0, 'coin')).toBe('coins');
    expect(pluralize(5, 'coin')).toBe('coins');
  });

  it('uses custom plural', () => {
    expect(pluralize(2, 'life', 'lives')).toBe('lives');
  });
});

describe('ordinal', () => {
  it('returns correct ordinal suffixes', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(22)).toBe('22nd');
    expect(ordinal(100)).toBe('100th');
    expect(ordinal(101)).toBe('101st');
  });
});
