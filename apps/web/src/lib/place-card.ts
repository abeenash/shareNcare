export type Box = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

const EDGE = 16;
const GAP = 14;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export function placeCard(target: Box | null, card: Size, screen: Size) {
  const middleTop = clamp((screen.height - card.height) / 2, EDGE, screen.height - card.height);
  if (!target) {
    return { top: middleTop, left: clamp((screen.width - card.width) / 2, EDGE, screen.width) };
  }

  const left = clamp(
    target.left + target.width / 2 - card.width / 2,
    EDGE,
    screen.width - card.width - EDGE,
  );
  const below = target.top + target.height + GAP;
  if (below + card.height <= screen.height - EDGE) return { top: below, left };

  const above = target.top - GAP - card.height;
  if (above >= EDGE) return { top: above, left };

  return { top: middleTop, left };
}
