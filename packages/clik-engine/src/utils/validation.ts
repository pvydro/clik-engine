import { ConsoleReporter } from '../debug/ConsoleReporter';

/**
 * Validation utilities for engine config and manager parameters.
 * All validators log errors via ConsoleReporter with fix suggestions.
 */

export function validatePositiveNumber(value: number, name: string, context: string): boolean {
  if (typeof value !== 'number' || isNaN(value) || value <= 0 || !isFinite(value)) {
    ConsoleReporter.error(
      `${context}: '${name}' must be a positive finite number, got ${value}`,
      `Provide a valid number greater than 0.`
    );
    return false;
  }
  return true;
}

export function validateNonNegativeNumber(value: number, name: string, context: string): boolean {
  if (typeof value !== 'number' || isNaN(value) || value < 0 || !isFinite(value)) {
    ConsoleReporter.error(
      `${context}: '${name}' must be a non-negative finite number, got ${value}`,
      `Provide a valid number >= 0.`
    );
    return false;
  }
  return true;
}

export function validateNonEmptyString(value: string, name: string, context: string): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) {
    ConsoleReporter.error(
      `${context}: '${name}' must be a non-empty string`,
      `Provide a valid string value.`
    );
    return false;
  }
  return true;
}

export function validateEnum<T extends string>(
  value: T,
  allowed: readonly T[],
  name: string,
  context: string
): boolean {
  if (!allowed.includes(value)) {
    ConsoleReporter.error(
      `${context}: '${name}' must be one of [${allowed.join(', ')}], got '${value}'`,
      `Use one of the allowed values.`
    );
    return false;
  }
  return true;
}

export function validateHexColor(value: string, name: string, context: string): boolean {
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
    ConsoleReporter.error(
      `${context}: '${name}' must be a valid hex color (e.g. #000000), got '${value}'`,
      `Use format #RGB, #RRGGBB, or #RRGGBBAA.`
    );
    return false;
  }
  return true;
}

export function validatePositiveInt(value: number, name: string, context: string): boolean {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    ConsoleReporter.error(
      `${context}: '${name}' must be a positive integer, got ${value}`,
      `Provide a whole number greater than 0.`
    );
    return false;
  }
  return true;
}
