import { tryGetContext } from "hono/context-storage";
import type { RequestIdVariables } from "hono/request-id";

export type Level = "info" | "warn" | "error";

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}/gi; //last part must be letters

export const hideEmails = (text: string) => text.replaceAll(EMAIL, "[email]");

export function errorFields(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export function log(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const requestId = tryGetContext<{ Variables: RequestIdVariables }>()?.get("requestId");
  const line = hideEmails(JSON.stringify({ level, event, requestId, ...fields }));

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
