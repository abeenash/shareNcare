import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../env";

export type Mail = { to: string; subject: string; text: string };

export async function sendMail(mail: Mail) {
  switch (env.MAIL_TRANSPORT) {
    case "console":
      console.log(`\n📬 To: ${mail.to}\n   Subject: ${mail.subject}\n\n${mail.text}\n`);
      return;
    case "file":
      await writeToOutbox(mail);
      return;
    case "resend":
      await sendWithResend(mail);
      return;
  }
}

async function writeToOutbox(mail: Mail) {
  const dir = env.MAIL_OUTBOX_DIR ?? "";
  await mkdir(dir, { recursive: true });
  await Bun.write(join(dir, `${Date.now()}-${crypto.randomUUID()}.json`), JSON.stringify(mail));
}

async function sendWithResend(mail: Mail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend refused the email: ${res.status} ${await res.text()}`);
  }
}
