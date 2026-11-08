import { env } from "../env";

//a guest has no account. Therefore, posting hands them a random key instead. Only the ticket's fingerprint is stored
export const newGuestKey = () =>
  crypto.getRandomValues(new Uint8Array(32)).toBase64({ alphabet: "base64url", omitPadding: true });

export const hashGuestKey = (key: string) =>
  new Bun.CryptoHasher("sha256").update(key).digest("hex");

// Who reported a note, without storing their IP address. The secret makes it impossible to guess an IP back from the fingerprint
export const reporterFingerprint = (ip: string) =>
  new Bun.CryptoHasher("sha256", env.BETTER_AUTH_SECRET).update(`board-report:${ip}`).digest("hex");
