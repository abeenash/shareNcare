import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { app } from "./app";
import { createAuth } from "./auth-config";
import { db } from "./db";
import { user } from "./db/auth-schema";

const client = testClient(app);
const as = (id: string) => ({
  headers: { "x-test-user": id },
});
const seenAt = async (id: string) =>
  (await db.select({ at: user.tourSeenAt }).from(user).where(eq(user.id, id)))[0]?.at;

describe("remembering Koinonia's tour", () => {
  test("you have to be signed in", async () => {
    const res = await client.api.me["tour-seen"].$post(undefined, as("nobody"));
    expect<number>(res.status).toBe(401);
  });

  test("marks the tour as seen for you, and nobody else", async () => {
    const res = await client.api.me["tour-seen"].$post(undefined, as("bob"));

    expect(res.status).toBe(204);
    expect(await seenAt("bob")).toBeInstanceOf(Date);
    expect(await seenAt("alice")).toBeNull();
  });
});

describe("the tour flag in the session", () => {
  const ORIGIN = "http://localhost:5173";
  const auth = createAuth({
    emailCodes: false,
    breachCheck: false,
  });

  const signUp = (body: object) =>
    auth.handler(
      new Request(`${ORIGIN}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify({
          name: "Asha Rai",
          email: `${crypto.randomUUID()}@test.dev`,
          password: "chai at four with didi",
          ...body,
        }),
      }),
    );

  test("a new account starts with the tour not seen, and the session says so", async () => {
    const res = await signUp({});
    const cookie = res.headers.getSetCookie()[0]?.split(";")[0] ?? "";

    const session = await auth.handler(
      new Request(`${ORIGIN}/api/auth/get-session`, { headers: { cookie } }),
    );
    const { user: me } = (await session.json()) as { user: { tourSeenAt: unknown } };
    expect(me.tourSeenAt).toBeNull();
  });

  test("nobody can mark it seen while signing up", async () => {
    const res = await signUp({ tourSeenAt: new Date().toISOString() });

    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("FIELD_NOT_ALLOWED");
  });
});
