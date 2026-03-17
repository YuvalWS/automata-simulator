import { saveAs } from 'file-saver';
import type { Automaton } from '@/models/automaton';
import { serializeToJson, deserializeFromJson } from './json-serializer';

export function saveToJsonFile(automaton: Automaton): void {
  const json = serializeToJson(automaton);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `${automaton.name || 'automaton'}.json`);
}

function openFilePicker(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const text = await file.text();
      resolve(text);
    };
    input.click();
  });
}

export async function loadFromJsonFile(): Promise<Automaton | null> {
  const text = await openFilePicker('.json');
  if (!text) return null;
  try {
    return deserializeFromJson(text);
  } catch (e) {
    alert(`Failed to load file: ${e instanceof Error ? e.message : 'Unknown error'}`);
    return null;
  }
}
