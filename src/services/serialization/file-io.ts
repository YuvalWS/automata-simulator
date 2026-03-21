import { saveAs } from 'file-saver';
import type { Automaton } from '@/models/automaton';
import { serializeToJson, deserializeFromJson } from './json-serializer';
import {
  getActiveTabFileHandle,
  setActiveTabFileHandle,
  clearActiveTabFileHandle,
} from '@/stores/tab-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = window as any;

export async function saveToJsonFile(automaton: Automaton): Promise<void> {
  const json = serializeToJson(automaton);
  const fileHandle = getActiveTabFileHandle();

  // Try to write to existing handle first
  if (fileHandle) {
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch {
      // Handle was invalidated or permission denied — fall through to picker/download
      clearActiveTabFileHandle();
    }
  }

  // Try File System Access API (Chromium browsers)
  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const handle = await win.showSaveFilePicker({
        suggestedName: `${automaton.name || 'automaton'}.json`,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      setActiveTabFileHandle(handle);
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (e) {
      // User cancelled the picker — don't fall through to download
      if (e instanceof DOMException && e.name === 'AbortError') return;
      clearActiveTabFileHandle();
    }
  }

  // Fallback: download via file-saver
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `${automaton.name || 'automaton'}.json`);
}

export async function loadFromJsonFile(): Promise<{ automaton: Automaton; fileHandle?: any } | null> {
  // Try File System Access API
  if (typeof win.showOpenFilePicker === 'function') {
    try {
      const [handle] = await win.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      return { automaton: deserializeFromJson(text), fileHandle: handle };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return null;
      // Fall through to legacy picker
    }
  }

  // Fallback: hidden <input> picker
  const text = await openFilePicker('.json');
  if (!text) return null;
  try {
    return { automaton: deserializeFromJson(text) };
  } catch (e) {
    alert(`Failed to load file: ${e instanceof Error ? e.message : 'Unknown error'}`);
    return null;
  }
}

export function clearFileHandle(): void {
  clearActiveTabFileHandle();
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
