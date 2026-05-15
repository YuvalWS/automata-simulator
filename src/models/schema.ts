import { z } from 'zod';

const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const ViewportSchema = z.object({
  panX: z.number(),
  panY: z.number(),
  zoom: z.number().positive(),
});

const AutomatonStateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: PointSchema,
  isInitial: z.boolean(),
  isAccepting: z.boolean(),
});

const PdaRuleSchema = z.object({
  inputSymbol: z.string(),
  stackPop: z.string(),
  stackPush: z.array(z.string()),
  peekAction: z.enum(['nop', 'push', 'pop']).optional(),
});

// Accept both v1 (single readSymbol, required writeSymbol) and v2 (readSymbols array, optional writeSymbol).
// The deserializer normalizes v1 → v2; everything downstream of load uses v2.
const TmRuleSchemaV1 = z.object({
  readSymbol: z.string(),
  writeSymbol: z.string(),
  direction: z.enum(['L', 'R', 'S']),
});
const TmRuleSchemaV2 = z.object({
  readSymbols: z.array(z.string()).min(1),
  writeSymbol: z.string().optional(),
  direction: z.enum(['L', 'R', 'S']),
});
const TmRuleSchema = z.union([TmRuleSchemaV2, TmRuleSchemaV1]);

const TransitionSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  symbols: z.array(z.string()),
  pdaRules: z.array(PdaRuleSchema).optional(),
  tmRules: z.array(TmRuleSchema).optional(),
  controlPointOffset: PointSchema.optional(),
});

const AutomatonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['DFA', 'NFA', 'PDA', 'TM']),
  alphabet: z.array(z.string()),
  states: z.array(AutomatonStateSchema),
  transitions: z.array(TransitionSchema),
  viewport: ViewportSchema,
  acceptanceMode: z.enum(['finalState', 'emptyStack', 'haltOnAccept']).optional(),
  pdaStackMode: z.enum(['pop', 'peek']).optional(),
  tmMode: z.enum(['deterministic', 'nondeterministic']).optional(),
  tmBlankSymbol: z.string().optional(),
});

export const SaveFileSchema = z.object({
  version: z.string(),
  automaton: AutomatonSchema,
});

export type SaveFile = z.infer<typeof SaveFileSchema>;

export { AutomatonSchema, AutomatonStateSchema, TransitionSchema, ViewportSchema, PointSchema };
