import { Transform } from 'class-transformer';

/**
 * Trims leading and trailing whitespace when the input value is a string.
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

/**
 * Removes common formatting characters (spaces, dashes, parentheses) and trims
 * whitespace when the input value is a string.
 */
export function NormalizeDigits(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s\-()]/g, '').trim() : value,
  );
}
