import { spyOn } from "bun:test";

export type LogEntry = {
  level: string;
  event: string;
  requestId?: string;
  [field: string]: unknown;
};

export function captureLogs() {
  const lines: string[] = [];
  const spies = (["log", "warn", "error"] as const).map((name) =>
    spyOn(console, name).mockImplementation((line: unknown) => {
      lines.push(String(line));
    }),
  );
  return {
    lines,
    entries: () => lines.map((line) => JSON.parse(line) as LogEntry),
    stop: () => {
      for (const spy of spies) spy.mockRestore();
    },
  };
}
