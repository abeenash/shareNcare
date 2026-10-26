import type { ApiErrorBody, ApiErrorCode, ApiIssue } from "@sharencare/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { ValidationError } from "./lib/validate";
import { healthRoute } from "./routes/health";
import { notesRoute } from "./routes/notes";

const errorBody = (
  code: ApiErrorCode,
  message: string,
  id: string,
  issues?: ApiIssue[],
): ApiErrorBody => ({
  error: { code, message, requestId: id, ...(issues && { issues }) },
});

export const app = new Hono()
  .basePath("/api")
  .use(requestId())
  .use(logger())
  .use(secureHeaders())
  .route("/health", healthRoute)
  .route("/notes", notesRoute);

app.notFound((c) =>
  c.json(
    errorBody("NOT_FOUND", `No route for ${c.req.method} ${c.req.path}`, c.get("requestId")),
    404,
  ),
);

app.onError((err, c) => {
  const id = c.get("requestId");

  if (err instanceof ValidationError) {
    return c.json(errorBody("VALIDATION", err.message, id, err.issues), 400);
  }

  if (err instanceof HTTPException) {
    const code: ApiErrorCode = err.status === 404 ? "NOT_FOUND" : "HTTP_ERROR";
    return c.json(errorBody(code, err.message, c.get("requestId")), err.status);
  }

  console.error(`[${id}]`, err);
  return c.json(errorBody("INTERNAL", "Something went wrong", id), 500);
});

export type AppType = typeof app;
