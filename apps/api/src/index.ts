import { APP_NAME, type HealthResponse } from "@sharencare/shared";
import { Hono } from "hono";
import { logger } from "hono/logger";

const app = new Hono()
  .basePath("/api")
  .use(logger())
  .get("/health", (c) =>
    c.json({
      ok: true,
      app: APP_NAME,
      runtime: `num ${Bun.version}`,
    } satisfies HealthResponse),
  );

export default {
  port: 5000,
  fetch: app.fetch,
};
