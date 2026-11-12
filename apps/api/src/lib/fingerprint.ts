import { env } from "../env";

/* Who reported a note, without storing their IP address. 
The secret makes it impossible to work an IP address back out of the fingerprint
*/
export const reporterFingerprint = (ip: string) =>
  new Bun.CryptoHasher("sha256", env.BETTER_AUTH_SECRET).update(`board-report:${ip}`).digest("hex");
