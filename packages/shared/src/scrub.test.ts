import { describe, expect, test } from "bun:test";
import { collectNothing, hideSecrets, scrubJson } from "./scrub";

const TOKEN = "Secret-Token_123456789";

const KEY = "q2Zt8vN4kX0bW7yLmP3sR9cT1uE6aH5jD-_fG2iK0oQ";

describe("hideSecrets", () => {
  test("hides email addresses", () => {
    expect(hideSecrets("Sign-up attempt for existing email: asha.rai+1@gmail.com")).toBe(
      "Sign-up attempt for existing email: [email]",
    );
  });

  test("leaves package versions in stack traces alone", () => {
    const line = "at node_modules/better-auth@1.7.14/dist/index.mjs:10";
    expect(hideSecrets(line)).toBe(line);
  });

  test("hides share and board tokens in paths", () => {
    expect(hideSecrets(`/s/${TOKEN}`)).toBe("/s/:token");
    expect(hideSecrets(`/b/${TOKEN}`)).toBe("/b/:token");
    expect(hideSecrets(`/api/shared/${TOKEN}/open`)).toBe("/api/shared/:token/open");
    expect(hideSecrets(`/api/shared-boards/${TOKEN}/live`)).toBe("/api/shared-boards/:token/live");
  });

  test("hides a token even when its slashes are written as %2F", () => {
    expect(hideSecrets(`next=%2Fb%2F${TOKEN}`)).toBe("next=%2Fb%2F:token");
  });

  test("hides a letter key after a #", () => {
    expect(hideSecrets(`/note/abc#${KEY}`)).toBe("/note/abc#:key");
  });

  test("cuts a full address at the ? or #", () => {
    expect(hideSecrets(`https://example.com/s/${TOKEN}?from=mail#${KEY}`)).toBe(
      "https://example.com/s/:token",
    );
    expect(hideSecrets("https://example.com/api/auth/callback/google?code=4/0Ab-secret")).toBe(
      "https://example.com/api/auth/callback/google",
    );
  });

  test("leaves request ids and route patterns alone", () => {
    const line =
      '{"request-id":"4c273209-f24e-4486-88ef-0f21696c4bdd","route":"/api/shared/:token"}';
    expect(hideSecrets(line)).toBe(line);
  });
});

describe("scrubJson", () => {
  test("cleans every string inside an object, however deep", () => {
    const report = {
      request: { url: `https://example.com/s/${TOKEN}#${KEY}` },
      breadCrumbs: [{ data: { from: "/", to: `/login?next=%2Fb%2F${TOKEN}` } }],
      tags: { requestId: "4c273209-f24e-4486-88ef-0f21696c4bdd" },
      count: 3,
    };

    expect(scrubJson(report)).toEqual({
      request: { url: "https://example.com/s/:token" },
      breadCrumbs: [{ data: { from: "/", to: "/login" } }],
      tags: { requestId: "4c273209-f24e-4486-88ef-0f21696c4bdd" },
      count: 3,
    });
  });
});

describe("collectNothing", () => {
  test("names every risky kind of data, and switches each one off", () => {
    expect(Object.keys(collectNothing)).toEqual(
      expect.arrayContaining([
        "userInfo",
        "cookies",
        "httpHeaders",
        "httpBodies",
        "urlQueryParams",
        "stackFrameVariables",
        "genAI",
      ]),
    );

    expect(JSON.stringify(collectNothing)).not.toContain("true");
    expect(collectNothing.httpBodies).toEqual([]);
  });
});
