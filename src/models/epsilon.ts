export const EPSILON = '\u03B5';
export const STACK_BOTTOM = 'Z\u2080';

export function isEpsilon(symbol: string): boolean {
  return symbol === EPSILON;
}

/**
 * Normalize common epsilon representations to the canonical EPSILON constant.
 * Handles:
 *   - empty string (user left field blank)
 *   - "\u00CE\u00B5" \u2014 UTF-8 bytes of \u03B5 (U+03B5) decoded as Latin-1 (CE \u2192 \u00CE, B5 \u2192 \u00B5).
 *     Happens when a UTF-8 JSON file is opened and re-saved by a Latin-1 editor.
 */
export function normalizeEpsilon(val: string): string {
  if (val === '') return EPSILON;
  if (val === '\u00CE\u00B5') return EPSILON; // Latin-1 mojibake of \u03B5
  return val;
}
