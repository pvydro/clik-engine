import { getTheme } from './Theme';

/**
 * Return the user-provided value if defined, otherwise fall back to theme.
 * Avoids repetitive `config.color ?? getTheme().colors.text` boilerplate.
 */
export function themedColor(value: number | undefined, themeKey: keyof import('./Theme').ThemeColors): number {
  return value ?? (getTheme().colors[themeKey] as number);
}

export function themedTextColor(value: string | undefined, themeKey: 'text' | 'textSecondary' = 'text'): string {
  return value ?? getTheme().colors[themeKey];
}

export function themedFont(value: string | undefined): string {
  return value ?? getTheme().fontFamily;
}

export function themedFontSize(value: string | undefined, size: 'small' | 'medium' | 'large' | 'title' = 'medium'): string {
  return value ?? getTheme().fontSize[size];
}

export function themedBorderRadius(value: number | undefined): number {
  return value ?? getTheme().borderRadius;
}
