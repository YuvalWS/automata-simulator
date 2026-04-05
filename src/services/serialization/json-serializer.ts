import type { Automaton } from '@/models/automaton';
import { SaveFileSchema } from '@/models/schema';
import type { SaveFile } from '@/models/schema';

const CURRENT_VERSION = '1.1.0';

export function serializeToJson(automaton: Automaton): string {
  const saveFile: SaveFile = {
    version: CURRENT_VERSION,
    automaton,
  };
  return JSON.stringify(saveFile, null, 2);
}

export function deserializeFromJson(json: string): Automaton {
  const parsed: unknown = JSON.parse(json);
  const result = SaveFileSchema.parse(parsed);
  return result.automaton as Automaton;
}
