import { describe, expect, test } from "bun:test";
import type { ApiErrorBody } from "@sharencare/shared";
import { testClient } from "hono/testing";
import { app } from "./app";

const client = testClient(app);

describe("GET /api/health", () => {
  test("returns ok, a request id and security headers", async () => {
    const res = await client.api.health.$get();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.app).toBe("shareNcare");
    expect(res.headers.get("x-request-id")).toBe(body.requestId);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("unknown routes", () => {
  test("return the standard error shape", async () => {
    const res = await app.request("/api/does-not-exist");
    expect(res.status).toBe(404);

    const body = (await res.json()) as ApiErrorBody;
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
