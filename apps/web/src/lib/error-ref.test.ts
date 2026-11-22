import { describe, expect, test } from "bun:test";
import { withRef } from "./error-ref";

const ID = "3f9a1c2e-7b4d-4e1a-9c0f-2d8e6b5a4c3d";

describe("withRef", () => {
  test("a server failure gets the first 8 characters of the request id", () => {
    expect(withRef("Something went wrong", 500, ID)).toBe("Something went wrong (ref 3f9a1c2e)");
  });

  test("a 4xx answer stays as it is, because it explains itself", () => {
    expect(withRef("Note not found", 404, ID)).toBe("Note not found");
  });

  test("no request id, no ref", () => {
    expect(withRef("Request failed with status 502", 502, undefined)).toBe(
      "Request failed with status 502",
    );
  });
});
