import * as Sentry from "@sentry/react";
import { collectNothing, scrubJson } from "@sharencare/shared";

export function startErrorTracking() {
  const dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    dataCollection: collectNothing,
    beforeSend: (event) => scrubJson(event),
  });
}
