export function writingLine(names: string[]): string | null {
  const [first, second] = names;
  if (first === undefined) return null;
  if (second === undefined) return `${first} is writing...`;
  if (names.length === 2) return `${first} and ${second} are writing...`;
  return `${first} and ${names.length - 1} others are writing...`;
}
