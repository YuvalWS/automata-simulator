export const EPSILON = '\u03B5';
export const STACK_BOTTOM = 'Z\u2080';

export function isEpsilon(symbol: string): boolean {
  return symbol === EPSILON;
}
