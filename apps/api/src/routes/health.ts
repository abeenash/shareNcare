import { APP_NAME, type HealthResponse } from "@sharencare/shared";
import { Hono } from "hono";

export const healthRoute = new Hono().get("/", (c) =>
  c.json({
    ok: true,
    app: APP_NAME,
    runtime: `bun ${Bun.version}`,
    requestId: c.get("requestId"),
  } satisfies HealthResponse),
);
