import { describe, it, expect } from 'vitest';
import { generateRandomWord } from '@/utils/random-word';

describe('generateRandomWord', () => {
  it('returns empty array for empty alphabet', () => {
    expect(generateRandomWord([])).toEqual([]);
  });

  it('returns word within default length bounds (1-8)', () => {
    const alphabet = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      const word = generateRandomWord(alphabet);
      expect(word.length).toBeGreaterThanOrEqual(1);
      expect(word.length).toBeLessThanOrEqual(8);
    }
  });

  it('all symbols come from the alphabet', () => {
    const alphabet = ['x', 'y'];
    for (let i = 0; i < 50; i++) {
      const word = generateRandomWord(alphabet);
      for (const sym of word) {
        expect(alphabet).toContain(sym);
      }
    }
  });

  it('respects custom min/max length', () => {
    const alphabet = ['a'];
    for (let i = 0; i < 50; i++) {
      const word = generateRandomWord(alphabet, 3, 5);
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(5);
    }
  });
});
