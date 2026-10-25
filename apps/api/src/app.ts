import type { ApiErrorBody, ApiErrorCode } from "@sharencare/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { healthRoute } from "./routes/health";

const errorBody = (code: ApiErrorCode, message: string, id: string): ApiErrorBody => ({
  error: { code, message, requestId: id },
});

export const app = new Hono()
  .basePath("/api")
  .use(requestId())
  .use(logger())
  .use(secureHeaders())
  .route("/health", healthRoute);

app.notFound((c) =>
  c.json(
    errorBody("NOT_FOUND", `No route for ${c.req.method} ${c.req.path}`, c.get("requestId")),
    404,
  ),
);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(errorBody("HTTP_ERROR", err.message, c.get("requestId")), err.status);
  }
  console.error(`[${c.get("requestId")}]`, err);
  return c.json(errorBody("INTERNAL", "Something went wrong", c.get("requestId")), 500);
});

export type AppType = typeof app;
