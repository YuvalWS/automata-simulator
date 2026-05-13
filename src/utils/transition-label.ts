import type { Transition, PdaRule, TmRule } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { EPSILON } from '@/models/epsilon';

function formatPdaRule(rule: PdaRule): string {
  const input = rule.inputSymbol || EPSILON;
  const pop = rule.stackPop || EPSILON;
  const push = rule.stackPush.length > 0 ? rule.stackPush.join('') : EPSILON;
  return `${input}, ${pop} \u2192 ${push}`;
}

/**
 * Format a TM rule in textbook style:
 *   `<reads> \u2192 <write>, <dir>` when a write is set (and not a no-op rewrite)
 *   `<reads> \u2192 <dir>`           when there is no write (or it equals the only read)
 */
function formatTmRule(rule: TmRule): string {
  const reads = rule.readSymbols.join(',');
  const hasWrite = !!rule.writeSymbol
    && rule.writeSymbol.length > 0
    && !(rule.readSymbols.length === 1 && rule.writeSymbol === rule.readSymbols[0]);
  return hasWrite
    ? `${reads} \u2192 ${rule.writeSymbol}, ${rule.direction}`
    : `${reads} \u2192 ${rule.direction}`;
}

export function getTransitionLabel(transition: Transition, automatonType: AutomatonType): string {
  if (automatonType === AutomatonType.PDA && transition.pdaRules && transition.pdaRules.length > 0) {
    return transition.pdaRules.map(formatPdaRule).join(' | ');
  }
  if (automatonType === AutomatonType.TM && transition.tmRules && transition.tmRules.length > 0) {
    return transition.tmRules.map(formatTmRule).join(' | ');
  }
  return transition.symbols.join(', ');
}
