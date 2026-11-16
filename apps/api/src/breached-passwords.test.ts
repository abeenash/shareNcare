import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { lastCodeFor } from "../test/fake-mailbox";
import { createAuth } from "./auth-config";

const ORIGIN = "http://localhost:5173";
const BREACHED = "password1234567"; // pretend this one leaked in a breach
const SAFE = "chai at four with didi";

// A pretend Have I Been Pwned. The real one answers GET /range/<first 5 hex
// characters of the SHA-1> with every leaked hash that starts that way.
const sha1 = (text: string) =>
  new Bun.CryptoHasher("sha1").update(text).digest("hex").toUpperCase();
const asked: string[] = [];
let serviceDown = false;
const realFetch = globalThis.fetch;

beforeEach(() => {
  asked.length = 0;
  serviceDown = false;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    asked.push(url);
    if (!url.startsWith("https://api.pwnedpasswords.com/range/"))
      throw new Error(`Unexpected ${url}`);
    if (serviceDown) return new Response("Service unavailable", { status: 503 });
    const prefix = url.slice(-5);
    const leaked = sha1(BREACHED);
    const lines = ["0000000000000000000000000000000000A:3"];
    if (leaked.startsWith(prefix)) lines.push(`${leaked.slice(5)}:52579`);
    return new Response(lines.join("\r\n"));
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function signUp(auth: ReturnType<typeof createAuth>, password: string) {
  const email = `${crypto.randomUUID()}@test.dev`;
  const res = await auth.handler(
    new Request(`${ORIGIN}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ name: "Asha Rai", email, password }),
    }),
  );
  return {
    email,
    status: res.status,
    body: (await res.json()) as { code?: string; message?: string },
  };
}

describe("the breached-password check", () => {
  const checked = createAuth({ emailCodes: false, breachCheck: true });

  test("refuses a password that has leaked before", async () => {
    const res = await signUp(checked, BREACHED);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PASSWORD_COMPROMISED");
    expect(res.body.message).toContain("data breach");
  });

  test("accepts a fresh one, and only 5 characters of its hash ever leave the server", async () => {
    const res = await signUp(checked, SAFE);

    expect(res.status).toBe(200);
    expect(asked).toHaveLength(1);
    expect(asked[0]).toBe(`https://api.pwnedpasswords.com/range/${sha1(SAFE).slice(0, 5)}`);
    expect(asked[0]).not.toContain(sha1(SAFE));
  });

  test("if the service is down, sign-up waits instead of skipping the check", async () => {
    serviceDown = true;
    const res = await signUp(checked, SAFE);

    expect(res.status).toBe(500);
  });

  test("guards a password reset too", async () => {
    const auth = createAuth({ emailCodes: true, breachCheck: true });
    const { email } = await signUp(auth, SAFE);
    const post = (path: string, body: object) =>
      auth.handler(
        new Request(`${ORIGIN}/api/auth${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: ORIGIN },
          body: JSON.stringify(body),
        }),
      );

    await post("/email-otp/request-password-reset", { email });
    const res = await post("/email-otp/reset-password", {
      email,
      otp: lastCodeFor(email),
      password: BREACHED,
    });

    expect(res.status).toBe(400);
  });

  test("when switched off, nothing is sent anywhere", async () => {
    const unchecked = createAuth({ emailCodes: false, breachCheck: false });
    const res = await signUp(unchecked, BREACHED);

    expect(res.status).toBe(200);
    expect(asked).toHaveLength(0);
  });
});
