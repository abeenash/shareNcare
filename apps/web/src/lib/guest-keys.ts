import { type GuestKeys, GuestKeysSchema } from "@sharencare/shared";

const STORAGE_KEY = "sharencare:guest-keys";

export function parseGuestKeys(raw: string | null): GuestKeys {
  if (!raw) return {};
  try {
    const result = GuestKeysSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

function load(): GuestKeys {
  try {
    return parseGuestKeys(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

function save(keys: GuestKeys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    //nothing to do
  }
}

export const guestKeyFor = (noteId: string): string | undefined => load()[noteId];

export function rememberGuestKey(noteId: string, guestKey: string) {
  save({ ...load(), [noteId]: guestKey });
}

export function forgetGuestKey(noteId: string) {
  const { [noteId]: _forgotten, ...rest } = load();
  save(rest);
}
