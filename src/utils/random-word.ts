/**
 * Generate a random word from the given alphabet.
 * Returns an array of symbols with length between minLen and maxLen.
 * Returns empty array if alphabet is empty.
 */
export function generateRandomWord(
  alphabet: string[],
  minLen = 1,
  maxLen = 8,
): string[] {
  if (alphabet.length === 0) return [];
  const len = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
  const word: string[] = [];
  for (let i = 0; i < len; i++) {
    word.push(alphabet[Math.floor(Math.random() * alphabet.length)]!);
  }
  return word;
}
