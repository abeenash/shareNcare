import { type LetterKeys, LetterKeysSchema } from "@sharencare/shared";

const STORAGE_KEY = "sharencare:letter-keys";

function load(): LetterKeys {
  try {
    const result = LetterKeysSchema.safeParse(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"),
    );
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

export const letterKeyFor = (noteId: string): string | null => load()[noteId] ?? null;

export function keepLetterKey(noteId: string, key: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...load(), [noteId]: key }));
    return true;
  } catch {
    return false;
  }
}
