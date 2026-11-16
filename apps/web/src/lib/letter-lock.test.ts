import { describe, expect, test } from "bun:test";
import { LOCKED_BOX, MAX_LOCKED_BOX, NoteInputSchema } from "@sharencare/shared";
import { lockWords, newLetterKey, unlockWords } from "./letter-lock";

const words = "Dear Didi,\nThank you for every chai break.";

describe("a letter key", () => {
  test("is 43 URL-safe characters, and never the same twice", () => {
    const keys = new Set(Array.from({ length: 100 }, newLetterKey));

    expect(keys.size).toBe(100);
    for (const key of keys) expect(key).toMatch(/^[\w-]{43}$/);
  });
});

describe("locking and unlocking", () => {
  test("the right key gets the exact words back, line breaks and all", async () => {
    const key = newLetterKey();

    expect(await unlockWords(await lockWords(words, key), key)).toBe(words);
  });

  test("Nepali, emoji and accents survive the trip", async () => {
    const key = newLetterKey();
    const nepali = "प्रिय दिदी, धेरै धेरै धन्यवाद 🙏 café";

    expect(await unlockWords(await lockWords(nepali, key), key)).toBe(nepali);
  });

  test("the box never contains the words", async () => {
    const box = await lockWords(words, newLetterKey());

    expect(box).not.toContain("Didi");
    expect(box).not.toContain("chai");
  });

  test("the same words locked twice make two different boxes", async () => {
    const key = newLetterKey();

    expect(await lockWords(words, key)).not.toBe(await lockWords(words, key));
  });

  test("the wrong key opens nothing", async () => {
    const box = await lockWords(words, newLetterKey());

    await expect(unlockWords(box, newLetterKey())).rejects.toThrow();
  });

  test("changing even one character of the box is caught", async () => {
    const key = newLetterKey();
    const box = await lockWords(words, key);
    const middle = Math.floor(box.length / 2);
    const swapped = box[middle] === "A" ? "B" : "A";
    const tampered = box.slice(0, middle) + swapped + box.slice(middle + 1);

    await expect(unlockWords(tampered, key)).rejects.toThrow();
  });

  test("something that is not a box is refused", async () => {
    await expect(unlockWords("Dear Didi", newLetterKey())).rejects.toThrow("not a locked letter");
  });
});

describe("what the server will accept", () => {
  test("a box has the exact shape the server checks for", async () => {
    expect(await lockWords(words, newLetterKey())).toMatch(LOCKED_BOX);
  });

  test("the longest possible letter still fits the server's limit", async () => {
    const longest = "प".repeat(5000); // 3 bytes each, the most a character here can take
    const box = await lockWords(longest, newLetterKey());

    expect(box.length).toBeLessThanOrEqual(MAX_LOCKED_BOX);
    const parsed = NoteInputSchema.safeParse({ title: "Long", description: box, locked: true });
    expect(parsed.success).toBe(true);
  });
});
