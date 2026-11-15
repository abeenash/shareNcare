import { LETTER_KEY } from "@sharencare/shared";

export function keyFromLink(hash: string): string | null {
  const key = hash.startsWith("#") ? hash.slice(1) : hash;
  return LETTER_KEY.test(key) ? key : null;
}
