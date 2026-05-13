import type { Automaton, TmRule } from '@/models/automaton';
import { SaveFileSchema } from '@/models/schema';
import type { SaveFile } from '@/models/schema';
import { normalizeEpsilon } from '@/models/epsilon';

const CURRENT_VERSION = '1.4.0';

export function serializeToJson(automaton: Automaton): string {
  const saveFile: SaveFile = {
    version: CURRENT_VERSION,
    automaton,
  };
  return JSON.stringify(saveFile, null, 2);
}

/**
 * Normalize PDA rule epsilon values after loading.
 * Handles empty strings and Latin-1 mojibake of ε that can appear when a
 * UTF-8 JSON file is opened and re-saved by a non-UTF-8 editor.
 */
function normalizePdaRules(automaton: Automaton): Automaton {
  if (!automaton.transitions.some((t) => t.pdaRules)) return automaton;
  return {
    ...automaton,
    transitions: automaton.transitions.map((t) =>
      t.pdaRules
        ? {
            ...t,
            pdaRules: t.pdaRules.map((r) => ({
              ...r,
              inputSymbol: normalizeEpsilon(r.inputSymbol),
              stackPop: normalizeEpsilon(r.stackPop),
            })),
          }
        : t,
    ),
  };
}

/**
 * Migrate TM rules from the v1 shape (`readSymbol: string`, required `writeSymbol`)
 * to the v2 shape (`readSymbols: string[]`, optional `writeSymbol`).
 */
function normalizeTmRules(automaton: Automaton): Automaton {
  if (!automaton.transitions.some((t) => t.tmRules)) return automaton;
  return {
    ...automaton,
    transitions: automaton.transitions.map((t) =>
      t.tmRules
        ? {
            ...t,
            tmRules: t.tmRules.map((r) => {
              const rec = r as TmRule & { readSymbol?: string };
              if (Array.isArray(rec.readSymbols)) return r;
              const reads = rec.readSymbol !== undefined ? [rec.readSymbol] : [];
              return {
                readSymbols: reads,
                writeSymbol: rec.writeSymbol,
                direction: rec.direction,
              } satisfies TmRule;
            }),
          }
        : t,
    ),
  };
}

export function deserializeFromJson(json: string): Automaton {
  const parsed: unknown = JSON.parse(json);
  const result = SaveFileSchema.parse(parsed);
  return normalizeTmRules(normalizePdaRules(result.automaton as Automaton));
}
