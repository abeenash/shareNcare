import { describe, expect, test } from "bun:test";
import { redirectHome } from "./home-address";

const OLD = "https://sharencare.onrender.com";

describe("one real address", () => {
  test("a request to the real address is left alone", () => {
    expect(redirectHome(new Request("http://localhost:5173/notes"))).toBeNull();
  });

  test("the old address sends you to the same page and query on the real one", () => {
    const res = redirectHome(new Request(`${OLD}/note/abc?tab=2`));

    expect(res?.status).toBe(308);
    expect(res?.headers.get("location")).toBe("http://localhost:5173/note/abc?tab=2");
  });

  test("a POST is redirected with 308 too, so it stays a POST", () => {
    const res = redirectHome(new Request(`${OLD}/api/internal/sweep-trash`, { method: "POST" }));
    expect(res?.status).toBe(308);
  });

  test("the health check answers under any name", () => {
    expect(redirectHome(new Request(`${OLD}/api/health`))).toBeNull();
  });
});
