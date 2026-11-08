import { getConnInfo } from "@hono/bun";
import type { Context } from "hono";
import { env } from "../env";

/*behind render, the visitor's real address arrives in this header.
On a laptop, there is no proxy, so we ask the connection itself*/
export const clientIp = (c: Context): string => {
  if (env.NODE_ENV === "production") {
    const forwarded = c.req.header("true-client-ip")?.trim();
    if (forwarded) return forwarded;
  }
  return getConnInfo(c).remote.address ?? "unknown";
};
