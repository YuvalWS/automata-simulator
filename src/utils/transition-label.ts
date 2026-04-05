import type { Transition, PdaRule } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { EPSILON } from '@/models/epsilon';

function formatPdaRule(rule: PdaRule): string {
  const input = rule.inputSymbol || EPSILON;
  const pop = rule.stackPop || EPSILON;
  const push = rule.stackPush.length > 0 ? rule.stackPush.join('') : EPSILON;
  return `${input}, ${pop} \u2192 ${push}`;
}

export function getTransitionLabel(transition: Transition, automatonType: AutomatonType): string {
  if (automatonType === AutomatonType.PDA && transition.pdaRules && transition.pdaRules.length > 0) {
    return transition.pdaRules.map(formatPdaRule).join(' | ');
  }
  return transition.symbols.join(', ');
}
