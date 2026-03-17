export function generateId(): string {
  return crypto.randomUUID();
}

export function generateStateName(existingNames: string[]): string {
  let i = 0;
  while (existingNames.includes(`q${i}`)) {
    i++;
  }
  return `q${i}`;
}
