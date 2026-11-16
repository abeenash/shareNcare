import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { outboxDir } from "./e2e-env";

type Mail = { to: string; subject: string; text: string };

async function mailsTo(email: string): Promise<Mail[]> {
  const names = (await readdir(outboxDir).catch(() => [])).sort();
  const mails = await Promise.all(
    names.map(async (name) => JSON.parse(await readFile(join(outboxDir, name), "utf-8")) as Mail),
  );
  return mails.filter((mail) => mail.to === email);
}

export async function codeFor(email: string, count = 1): Promise<string> {
  let mails: Mail[] = [];
  await expect
    .poll(
      async () => {
        mails = await mailsTo(email);
        return mails.length;
      },
      { message: `waiting for email #${count} tp ${email}` },
    )
    .toBeGreaterThanOrEqual(count);

  const code = mails[count - 1]?.text.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error(`Email #${count} to ${email} has no 6-digit code`);
  return code;
}
