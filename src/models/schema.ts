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

const TransitionSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  symbols: z.array(z.string()),
  pdaRules: z.array(PdaRuleSchema).optional(),
  controlPointOffset: PointSchema.optional(),
});

const AutomatonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['DFA', 'NFA', 'PDA']),
  alphabet: z.array(z.string()),
  states: z.array(AutomatonStateSchema),
  transitions: z.array(TransitionSchema),
  viewport: ViewportSchema,
  acceptanceMode: z.enum(['finalState', 'emptyStack']).optional(),
  pdaStackMode: z.enum(['pop', 'peek']).optional(),
});

export const SaveFileSchema = z.object({
  version: z.string(),
  automaton: AutomatonSchema,
});

export type SaveFile = z.infer<typeof SaveFileSchema>;

export { AutomatonSchema, AutomatonStateSchema, TransitionSchema, ViewportSchema, PointSchema };
