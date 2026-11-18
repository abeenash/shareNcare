import { describe, expect, test } from "bun:test";
import { placeCard } from "./place-card";

const screen = { width: 1200, height: 800 };
const card = { width: 320, height: 200 };

describe("where the tour card goes", () => {
  test("in the middle when nothing is highlighted", () => {
    expect(placeCard(null, card, screen)).toEqual({ top: 300, left: 440 });
  });

  test("just under the control, centred on it, when there's room", () => {
    const button = { top: 20, left: 500, width: 100, height: 40 };
    expect(placeCard(button, card, screen)).toEqual({ top: 74, left: 390 });
  });

  test("above the control when it sits near the bottom", () => {
    const button = { top: 700, left: 500, width: 100, height: 40 };
    expect(placeCard(button, card, screen)).toEqual({ top: 486, left: 390 });
  });

  test("never off the right edge, even for a control in the corner", () => {
    const corner = { top: 20, left: 1150, width: 40, height: 40 };
    expect(placeCard(corner, card, screen).left).toBe(1200 - 320 - 16);
  });

  test("never off the left edge on a phone", () => {
    const menu = { top: 12, left: 16, width: 32, height: 32 };
    const phone = { width: 375, height: 812 };
    expect(placeCard(menu, { width: 343, height: 220 }, phone).left).toBe(16);
  });
});
