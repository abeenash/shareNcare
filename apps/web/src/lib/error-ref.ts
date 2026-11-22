export function withRef(words: string, status: number, requestId: string | undefined) {
  if (status < 500 || !requestId) return words;
  return `${words} (ref ${requestId.slice(0, 8)})`;
}
