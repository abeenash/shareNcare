import { createMiddleware } from "hono/factory";
import { routePath } from "hono/route";
import { log } from "../lib/log";

type RequestLogEnv = {
  Variables: { requestId: string; user?: { id: string } | null };
};

const AUTH_WORDS = /^\/api\/auth(\/[a-z-]+){1,2}$/;

export function routeForLog(path: string, route: string) {
  if (route === "/api/auth/*" && AUTH_WORDS.test(path)) return path;
  return route;
}

export const requestLog = createMiddleware<RequestLogEnv>(async (c, next) => {
  const started = performance.now();
  await next();

  c.header("X-Request-Id", c.get("requestId"));
  const status = c.res.status;
  log(status >= 500 ? "error" : "info", "request", {
    method: c.req.method,
    route: routeForLog(c.req.path, routePath(c)),
    status,
    ms: Math.round(performance.now() - started),
    userId: c.get("user")?.id,
  });
});
