import * as Sentry from "@sentry/bun";
import { collectNothing, scrubJson } from "@sharencare/shared";
import { tryGetContext } from "hono/context-storage";
import { routePath } from "hono/route";
import { env } from "../env";
import { routeForLog } from "../middleware/request-log";
import { errorFields, log } from "./log";

type TrackedEnv = {
  Variables: {
    requestId: string;
    user?: { id: string } | null;
  };
};

export function errorTrackingOptions(dsn: string): Sentry.BunOptions {
  return {
    dsn,
    environment: env.NODE_ENV,
    dataCollection: collectNothing,
    defaultIntegrations: false,
    enableRuntimeChannelInjection: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
    ],
    beforeSend: (event) => scrubJson(event),
  };
}

export function startErrorTracking() {
  if (env.SENTRY_DSN) {
    Sentry.init(errorTrackingOptions(env.SENTRY_DSN));
  }
}

export function trackError(event: string, error: unknown, fields: Record<string, unknown> = {}) {
  log("error", event, { ...fields, error: errorFields(error) });

  const c = tryGetContext<TrackedEnv>();
  const userId = c?.get("user")?.id;
  Sentry.captureException(error, {
    tags: {
      event,
      requestId: c?.get("requestId"),
      route: c ? routeForLog(c.req.path, routePath(c)) : undefined,
    },
    user: userId ? { id: userId } : undefined,
  });
}
