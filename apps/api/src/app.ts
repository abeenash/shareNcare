import type { ApiErrorBody, ApiErrorCode, ApiIssue } from "@sharencare/shared";
import { Hono } from "hono";
import { contextStorage } from "hono/context-storage";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import { auth } from "./auth";
import { errorFields, log } from "./lib/log";
import { ValidationError } from "./lib/validate";
import { requestLog } from "./middleware/request-log";
import { boardsRoute } from "./routes/boards";
import { featuresRoute } from "./routes/features";
import { healthRoute } from "./routes/health";
import { internalRoute } from "./routes/internal";
import { meRoute } from "./routes/me";
import { notesRoute } from "./routes/notes";
import { sharedRoute } from "./routes/shared";
import { sharedBoardsRoute } from "./routes/shared-boards";

const errorBody = (
  code: ApiErrorCode,
  message: string,
  id: string,
  issues?: ApiIssue[],
): ApiErrorBody => ({
  error: { code, message, requestId: id, ...(issues && { issues }) },
});

const codeForStatus: Record<number, ApiErrorCode> = {
  404: "NOT_FOUND",
  429: "RATE_LIMITED",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  409: "CONFLICT",
};

export const app = new Hono()
  .basePath("/api")
  .use(contextStorage())
  .use(requestId())
  .use(requestLog)
  .use(timing())
  .use(secureHeaders())
  .route("/health", healthRoute)
  .route("/features", featuresRoute)
  .route("/me", meRoute)
  .route("/notes", notesRoute)
  .route("/shared", sharedRoute)
  .route("/boards", boardsRoute)
  .route("/shared-boards", sharedBoardsRoute)
  .route("/internal", internalRoute);

app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

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
    const code = codeForStatus[err.status] ?? "HTTP_ERROR";
    return c.json(errorBody(code, err.message, c.get("requestId")), err.status);
  }

  log("error", "crash", { error: errorFields(err) });
  return c.json(errorBody("INTERNAL", "Something went wrong", id), 500);
});

export type AppType = typeof app;
