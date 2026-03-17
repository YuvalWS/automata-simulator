import type { Automaton } from '@/models/automaton';
import { AutomatonType } from '@/models/types';
import { EPSILON } from '@/models/epsilon';

export interface ValidationMessage {
  type: 'error' | 'warning';
  message: string;
}

export function validateAutomaton(automaton: Automaton): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  const hasInitial = automaton.states.some((s) => s.isInitial);
  if (!hasInitial) {
    messages.push({ type: 'error', message: 'No initial state defined.' });
  }

  if (automaton.alphabet.length === 0) {
    messages.push({ type: 'warning', message: 'Alphabet is empty.' });
  }

  if (automaton.type === AutomatonType.DFA) {
    // Warn if DFA has epsilon transitions
    const hasEpsilon = automaton.transitions.some((t) => t.symbols.includes(EPSILON));
    if (hasEpsilon) {
      messages.push({ type: 'warning', message: 'DFA should not have \u03B5-transitions.' });
    }

    // Check for symbol conflicts: multiple transitions from same state on same symbol
    for (const state of automaton.states) {
      const symbolMap = new Map<string, number>();
      for (const t of automaton.transitions) {
        if (t.sourceId !== state.id) continue;
        for (const sym of t.symbols) {
          if (sym === EPSILON) continue;
          symbolMap.set(sym, (symbolMap.get(sym) ?? 0) + 1);
        }
      }
      for (const [sym, count] of symbolMap) {
        if (count > 1) {
          messages.push({
            type: 'error',
            message: `DFA conflict: state "${state.name}" has ${count} transitions on symbol "${sym}".`,
          });
        }
      }

      // Check for missing transitions (only if alphabet is defined)
      if (automaton.alphabet.length > 0) {
        for (const sym of automaton.alphabet) {
          if (sym === EPSILON) continue;
          if (!symbolMap.has(sym)) {
            messages.push({
              type: 'warning',
              message: `State "${state.name}" has no transition for symbol "${sym}".`,
            });
          }
        }
      }
    }
  }

  return messages;
}

export function validateWord(word: string[], alphabet: string[]): ValidationMessage[] {
  if (alphabet.length === 0) return [];

  const messages: ValidationMessage[] = [];
  const alphabetSet = new Set(alphabet);
  const invalid = word.filter((s) => !alphabetSet.has(s));
  if (invalid.length > 0) {
    const unique = [...new Set(invalid)];
    messages.push({
      type: 'error',
      message: `Word contains symbols not in alphabet: ${unique.map((s) => `"${s}"`).join(', ')}.`,
    });
  }
  return messages;
}
