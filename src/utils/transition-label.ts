import type { Transition, PdaRule, TmRule } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { EPSILON, toDisplayBlank } from '@/models/epsilon';

function formatPdaRule(rule: PdaRule): string {
  const input = rule.inputSymbol || EPSILON;
  const pop = rule.stackPop || EPSILON;
  const push = rule.stackPush.length > 0 ? rule.stackPush.join('') : EPSILON;
  return `${input}, ${pop} → ${push}`;
}

/**
 * Format a TM rule in textbook style:
 *   `<reads> → <write>, <dir>` when a write is set (and not a no-op rewrite)
 *   `<reads> → <dir>`           when there is no write (or it equals the only read)
 *
 * Rules store the canonical blank symbol (DEFAULT_BLANK_SYMBOL); we translate
 * to the user's display blank here.
 */
function formatTmRule(rule: TmRule, displayBlank: string | undefined): string {
  const reads = toDisplayBlank(rule.readSymbols.join(','), displayBlank);
  const hasWrite = !!rule.writeSymbol
    && rule.writeSymbol.length > 0
    && !(rule.readSymbols.length === 1 && rule.writeSymbol === rule.readSymbols[0]);
  if (!hasWrite) return `${reads} → ${rule.direction}`;
  const write = toDisplayBlank(rule.writeSymbol!, displayBlank);
  return `${reads} → ${write}, ${rule.direction}`;
}

export function getTransitionLabel(
  transition: Transition,
  automatonType: AutomatonType,
  tmBlankSymbol?: string,
): string {
  if (automatonType === AutomatonType.PDA && transition.pdaRules && transition.pdaRules.length > 0) {
    return transition.pdaRules.map(formatPdaRule).join(' | ');
  }
  if (automatonType === AutomatonType.TM && transition.tmRules && transition.tmRules.length > 0) {
    return transition.tmRules.map((r) => formatTmRule(r, tmBlankSymbol)).join(' | ');
  }
  return transition.symbols.join(', ');
}
