import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    engine: vi.fn(),
    error: vi.fn(),
  },
}));

import { I18nManager } from '../../src/i18n/I18nManager';

describe('I18nManager', () => {
  it('translates basic keys', () => {
    const i18n = new I18nManager();
    i18n.addLocale('en', { hello: 'Hello', goodbye: 'Goodbye' });
    i18n.setLocale('en');
    expect(i18n.t('hello')).toBe('Hello');
  });

  it('supports dot-notation nested keys', () => {
    const i18n = new I18nManager();
    i18n.addLocale('en', { menu: { play: 'Play', quit: 'Quit' } });
    i18n.setLocale('en');
    expect(i18n.t('menu.play')).toBe('Play');
    expect(i18n.t('menu.quit')).toBe('Quit');
  });

  it('interpolates parameters', () => {
    const i18n = new I18nManager();
    i18n.addLocale('en', { score: 'Score: {{points}}' });
    i18n.setLocale('en');
    expect(i18n.t('score', { points: 42 })).toBe('Score: 42');
  });

  it('falls back to fallback locale', () => {
    const i18n = new I18nManager();
    i18n.addLocale('en', { hello: 'Hello' });
    i18n.addLocale('fr', {});
    i18n.setLocale('fr');
    expect(i18n.t('hello')).toBe('Hello'); // falls back to en
  });

  it('returns [key] for missing translations', () => {
    const i18n = new I18nManager();
    i18n.addLocale('en', {});
    i18n.setLocale('en');
    expect(i18n.t('missing.key')).toBe('[missing.key]');
  });

  it('switches locales', () => {
    const i18n = new I18nManager();
    i18n.addLocale('en', { hi: 'Hello' });
    i18n.addLocale('es', { hi: 'Hola' });
    i18n.setLocale('en');
    expect(i18n.t('hi')).toBe('Hello');
    i18n.setLocale('es');
    expect(i18n.t('hi')).toBe('Hola');
  });

  it('lists available locales', () => {
    const i18n = new I18nManager();
    i18n.addLocale('en', {});
    i18n.addLocale('fr', {});
    i18n.addLocale('de', {});
    expect(i18n.getAvailableLocales()).toEqual(['en', 'fr', 'de']);
  });
});
