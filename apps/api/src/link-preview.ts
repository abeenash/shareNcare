import { ShareTokenSchema } from "@sharencare/shared";
import { and, eq, isNull } from "drizzle-orm";
import { html } from "hono/html";
import { db } from "./db";
import { notes } from "./db/schema";
import { env } from "./env";

const indexHtml = Bun.file("../web/dist/index.html");

async function recipientFor(token: string) {
  if (!ShareTokenSchema.safeParse({ token }).success) return null;
  const [letter] = await db
    .select({ recipient: notes.recipient })
    .from(notes)
    .where(and(eq(notes.shareToken, token), isNull(notes.deletedAt)));
  return letter?.recipient ?? null;
}

export async function sharedLetterPage(token: string) {
  const recipient = await recipientFor(token);
  const title = recipient ? `A letter for ${recipient}` : "A letter for you";

  const tags = await html`
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="Someone wrote you a letter on ShareNCare. Tap to open it." />
    <meta property="og:site_name" content="ShareNCare" />
    <meta property="og:image" content="${env.BETTER_AUTH_URL}/notes_icon.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="robots" content="noindex" />
    <meta name="referrer" content="no-referrer" />`;

  return (await indexHtml.text()).replace("</head>", `${tags}\n  </head>`);
}
