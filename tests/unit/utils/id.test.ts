import { describe, it, expect } from 'vitest';
import { generateStateName } from '@/utils/id';

describe('id utilities', () => {
  describe('generateStateName', () => {
    it('returns q0 when no existing names', () => {
      expect(generateStateName([])).toBe('q0');
    });

    it('returns q1 when q0 exists', () => {
      expect(generateStateName(['q0'])).toBe('q1');
    });

    it('fills gaps in numbering', () => {
      expect(generateStateName(['q0', 'q2'])).toBe('q1');
    });

    it('handles non-sequential names', () => {
      expect(generateStateName(['q0', 'q1', 'q2'])).toBe('q3');
    });
  });
});
