import type { Mail } from "../src/lib/mailer";

export const mailbox: Mail[] = [];

export const outage = { on: false };

export async function fakeSendMail(mail: Mail) {
  if (outage.on) throw new Error("The email service is down");
  mailbox.push(mail);
}

export const mailsTo = (email: string) => mailbox.filter((mail) => mail.to === email);

export function lastCodeFor(email: string) {
  const code = mailsTo(email)
    .at(-1)
    ?.text.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error(`No code was emailed to ${email}`);
  return code;
}
