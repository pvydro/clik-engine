import { ConsoleReporter } from '../debug/ConsoleReporter';

export type TranslationData = Record<string, string | Record<string, string>>;

export class I18nManager {
  private translations: Map<string, TranslationData> = new Map();
  private currentLocale = 'en';
  private fallbackLocale = 'en';

  addLocale(locale: string, data: TranslationData): this {
    this.translations.set(locale, data);
    ConsoleReporter.engine(`i18n: loaded locale '${locale}' (${Object.keys(data).length} keys)`);
    return this;
  }

  setLocale(locale: string): void {
    if (!this.translations.has(locale)) {
      ConsoleReporter.error(
        `i18n: locale '${locale}' not found`,
        `Available locales: ${Array.from(this.translations.keys()).join(', ')}`
      );
      return;
    }
    this.currentLocale = locale;
    ConsoleReporter.engine(`i18n: locale set to '${locale}'`);
  }

  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Get a translated string by key. Supports nested keys with dot notation.
   * Supports interpolation: t('hello', { name: 'World' }) with "hello": "Hello {{name}}!"
   */
  t(key: string, params?: Record<string, string | number>): string {
    let value = this.resolve(key, this.currentLocale) ?? this.resolve(key, this.fallbackLocale);

    if (value === undefined) {
      ConsoleReporter.error(`i18n: missing key '${key}' in locale '${this.currentLocale}'`);
      return `[${key}]`;
    }

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }

    return value;
  }

  private resolve(key: string, locale: string): string | undefined {
    const data = this.translations.get(locale);
    if (!data) return undefined;

    // Support dot notation: "menu.play" → data.menu.play
    const parts = key.split('.');
    let current: unknown = data;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }

  /** Detect browser locale */
  static detectLocale(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.language.split('-')[0];
    }
    return 'en';
  }

  getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }
}
