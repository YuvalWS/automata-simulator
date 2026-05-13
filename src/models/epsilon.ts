export const EPSILON = '\u03B5';
export const STACK_BOTTOM = 'Z\u2080';
export const DEFAULT_BLANK_SYMBOL = '⊔'; // ⊔ (U+2294, LaTeX \sqcup)

export const BLANK_DISPLAY_OPTIONS = ['_', '⊔', 'Δ'] as const;
export type BlankDisplayOption = (typeof BLANK_DISPLAY_OPTIONS)[number];

export function isBlankDisplayOption(s: string): s is BlankDisplayOption {
  return (BLANK_DISPLAY_OPTIONS as readonly string[]).includes(s);
}

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

/**
 * Convert canonical blank (DEFAULT_BLANK_SYMBOL) in `s` to the user's chosen
 * display blank. tmBlankSymbol is a display-only preference; rules, the tape,
 * and JSON storage always use DEFAULT_BLANK_SYMBOL canonically.
 */
export function toDisplayBlank(s: string, displayBlank: string | undefined): string {
  if (!displayBlank || displayBlank === DEFAULT_BLANK_SYMBOL) return s;
  return s.split(DEFAULT_BLANK_SYMBOL).join(displayBlank);
}

/**
 * Convert the user's display blank in `s` to the canonical DEFAULT_BLANK_SYMBOL
 * for storage. Inverse of toDisplayBlank.
 */
export function fromDisplayBlank(s: string, displayBlank: string | undefined): string {
  if (!displayBlank || displayBlank === DEFAULT_BLANK_SYMBOL) return s;
  return s.split(displayBlank).join(DEFAULT_BLANK_SYMBOL);
}
