export function retryDelay(attempt: number, random = Math.random): number {
  const longest_wait_time = Math.min(30_000, 1000 * 2 ** attempt);
  return longest_wait_time / 2 + random() * (longest_wait_time / 2);
}
