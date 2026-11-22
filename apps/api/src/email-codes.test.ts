import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { captureLogs } from "../test/capture-logs";
import { lastCodeFor, mailsTo, outage } from "../test/fake-mailbox";
import { app } from "./app";
import { createAuth } from "./auth-config";
import { db } from "./db";
import { user, verification } from "./db/schema";

const ORIGIN = "http://localhost:5173";
const withCodes = createAuth({ emailCodes: true, breachCheck: false });
const withoutCodes = createAuth({ emailCodes: false, breachCheck: false });
type Auth = typeof withCodes;
// What Better Auth answers with: an error has a code like "INVALID_OTP" and a message.
type Answer = { code?: string; message?: string; [field: string]: unknown };

// Talks to Better Auth the way a browser does: a POST to /api/auth/..., with cookies.
async function post(auth: Auth, path: string, body: object, cookie = "") {
  const res = await auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, cookie },
      body: JSON.stringify(body),
    }),
  );
  return {
    status: res.status,
    body: (await res.json().catch(() => ({}))) as Answer,
    cookie: sessionCookie(res),
  };
}

// "better-auth.session_token=abc..." from a response, or "" if it started no session.
function sessionCookie(res: Response) {
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("better-auth.session_token="));
  return cookie?.split(";")[0] ?? "";
}

async function sessionFor(auth: Auth, cookie: string) {
  const res = await auth.handler(
    new Request(`${ORIGIN}/api/auth/get-session`, { headers: { cookie } }),
  );
  return (await res.json()) as { user: { email: string } } | null;
}

const newEmail = () => `${crypto.randomUUID()}@test.dev`;
const PASSWORD = "chai at four with didi";
const signUp = (auth: Auth, email: string, password = PASSWORD) =>
  post(auth, "/sign-up/email", { name: "Asha Rai", email, password });

async function verifiedAccount() {
  const email = newEmail();
  await signUp(withCodes, email);
  const verified = await post(withCodes, "/email-otp/verify-email", {
    email,
    otp: lastCodeFor(email),
  });
  return { email, cookie: verified.cookie };
}

describe("signing up with email codes on", () => {
  test("sends a 6-digit code, and gives no session until it's typed", async () => {
    const email = newEmail();
    const res = await signUp(withCodes, email);

    expect(res.status).toBe(200);
    expect(res.cookie).toBe("");
    expect(mailsTo(email)).toHaveLength(1);
    expect(lastCodeFor(email)).toMatch(/^\d{6}$/);
  });

  test("the right code confirms the email and signs you in", async () => {
    const email = newEmail();
    await signUp(withCodes, email);

    const res = await post(withCodes, "/email-otp/verify-email", {
      email,
      otp: lastCodeFor(email),
    });

    expect(res.status).toBe(200);
    expect((await sessionFor(withCodes, res.cookie))?.user.email).toBe(email);
    const [row] = await db.select().from(user).where(eq(user.email, email));
    expect(row?.emailVerified).toBe(true);
  });

  test("the database never holds the code in a readable form", async () => {
    const email = newEmail();
    await signUp(withCodes, email);

    const rows = await db.select().from(verification);
    const stored = rows.find((row) => row.identifier.endsWith(email));
    expect(stored).toBeDefined();
    expect(stored?.value).not.toContain(lastCodeFor(email));
  });

  test("three wrong guesses use the code up, even for the right answer after", async () => {
    const email = newEmail();
    await signUp(withCodes, email);
    const code = lastCodeFor(email);
    const wrong = code === "000000" ? "111111" : "000000";

    for (let guess = 0; guess < 3; guess++) {
      const res = await post(withCodes, "/email-otp/verify-email", { email, otp: wrong });
      expect(res.status).toBe(400);
    }
    const late = await post(withCodes, "/email-otp/verify-email", { email, otp: code });

    expect(late.status).toBe(403);
    expect(late.body.code).toBe("TOO_MANY_ATTEMPTS");
  });

  test("a code stops working after 5 minutes", async () => {
    const email = newEmail();
    await signUp(withCodes, email);
    await db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verification.identifier, `email-verification-otp-${email}`));

    const res = await post(withCodes, "/email-otp/verify-email", {
      email,
      otp: lastCodeFor(email),
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("OTP_EXPIRED");
  });

  test("signing up with a taken email looks exactly like a fresh sign-up", async () => {
    const { email } = await verifiedAccount();

    const again = await signUp(withCodes, email, "someone else's long password");
    const fresh = await signUp(withCodes, newEmail());

    expect(again.status).toBe(fresh.status);
    expect(Object.keys(again.body).sort()).toEqual(Object.keys(fresh.body).sort());
    expect(again.cookie).toBe("");
  });

  test("if the email can't be sent, the account waits, and the next sign-in tries again", async () => {
    const email = newEmail();
    outage.on = true;
    const res = await signUp(withCodes, email).finally(() => {
      outage.on = false;
    });

    // Better Auth catches the failure and logs it, so the sign-up itself still "works".
    expect(res.status).toBe(200);
    expect(mailsTo(email)).toHaveLength(0);

    const retry = await post(withCodes, "/sign-in/email", { email, password: PASSWORD });
    expect(retry.status).toBe(403);
    const verified = await post(withCodes, "/email-otp/verify-email", {
      email,
      otp: lastCodeFor(email),
    });
    expect(verified.status).toBe(200);
  });

  test("a failed email is logged loudly, as JSON, without the address", async () => {
    const email = newEmail();
    const logs = captureLogs();
    outage.on = true;
    await signUp(withCodes, email).finally(() => {
      outage.on = false;
      logs.stop();
    });

    const failed = logs.entries().find((entry) => entry.event === "email.failed");
    expect(failed).toMatchObject({ level: "error", kind: "email-verification" });
    expect(logs.lines.join("\n")).not.toContain(email);
  });
});

describe("signing in before the email is confirmed", () => {
  test("is refused, and a fresh code is emailed", async () => {
    const email = newEmail();
    await signUp(withCodes, email);

    const res = await post(withCodes, "/sign-in/email", { email, password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
    expect(mailsTo(email)).toHaveLength(2);
  });

  test("accounts made before Day 20 confirm their email at their next sign-in", async () => {
    const email = newEmail();
    const before = await signUp(withoutCodes, email);
    expect(before.cookie).not.toBe("");

    const refused = await post(withCodes, "/sign-in/email", { email, password: PASSWORD });
    const verified = await post(withCodes, "/email-otp/verify-email", {
      email,
      otp: lastCodeFor(email),
    });

    expect(refused.status).toBe(403);
    expect(verified.status).toBe(200);
    const signedIn = await post(withCodes, "/sign-in/email", { email, password: PASSWORD });
    expect(signedIn.status).toBe(200);
  });
});

describe("forgot password", () => {
  const NEW_PASSWORD = "a brand new long password";

  test("a code by email sets a new password, and signs out every old session", async () => {
    const { email, cookie: oldSession } = await verifiedAccount();

    await post(withCodes, "/email-otp/request-password-reset", { email });
    expect(mailsTo(email).at(-1)?.subject).toContain("password reset");
    const reset = await post(withCodes, "/email-otp/reset-password", {
      email,
      otp: lastCodeFor(email),
      password: NEW_PASSWORD,
    });

    expect(reset.status).toBe(200);
    expect((await post(withCodes, "/sign-in/email", { email, password: PASSWORD })).status).toBe(
      401,
    );
    expect(
      (await post(withCodes, "/sign-in/email", { email, password: NEW_PASSWORD })).status,
    ).toBe(200);
    expect(await sessionFor(withCodes, oldSession)).toBeNull();
  });

  test("a reset code works only once", async () => {
    const { email } = await verifiedAccount();
    await post(withCodes, "/email-otp/request-password-reset", { email });
    const otp = lastCodeFor(email);

    await post(withCodes, "/email-otp/reset-password", { email, otp, password: NEW_PASSWORD });
    const again = await post(withCodes, "/email-otp/reset-password", {
      email,
      otp,
      password: "the attacker's new password",
    });

    expect(again.status).toBe(400);
  });

  test("an unknown email gets the same answer, and no email is sent", async () => {
    const known = await verifiedAccount();
    const unknown = newEmail();

    const a = await post(withCodes, "/email-otp/request-password-reset", { email: known.email });
    const b = await post(withCodes, "/email-otp/request-password-reset", { email: unknown });

    expect(b.status).toBe(a.status);
    expect(b.body).toEqual(a.body);
    expect(mailsTo(unknown)).toHaveLength(0);
  });

  test("the new password must still be 12 characters or more", async () => {
    const { email } = await verifiedAccount();
    await post(withCodes, "/email-otp/request-password-reset", { email });

    const res = await post(withCodes, "/email-otp/reset-password", {
      email,
      otp: lastCodeFor(email),
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PASSWORD_TOO_SHORT");
  });
});

describe("with email codes off (until the web has a code screen)", () => {
  test("sign-up signs you in at once, and sends nothing", async () => {
    const email = newEmail();
    const res = await signUp(withoutCodes, email);

    expect(res.status).toBe(200);
    expect(res.cookie).not.toBe("");
    expect(mailsTo(email)).toHaveLength(0);
  });

  test("the code routes don't exist at all", async () => {
    const email = newEmail();
    await signUp(withoutCodes, email);

    for (const path of ["/email-otp/send-verification-otp", "/email-otp/request-password-reset"]) {
      const res = await post(withoutCodes, path, { email, type: "email-verification" });
      expect(res.status).toBe(404);
    }
    expect(mailsTo(email)).toHaveLength(0);
  });

  test("the web app is told codes are off", async () => {
    const res = await testClient(app).api.features.$get();

    expect(await res.json()).toEqual({ emailCodes: false });
  });
});

describe("password rules", () => {
  test("a password shorter than 12 characters is refused", async () => {
    const res = await signUp(withoutCodes, newEmail(), "elevenchars");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PASSWORD_TOO_SHORT");
  });
});
