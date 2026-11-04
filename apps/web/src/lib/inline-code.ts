export type Piece = { text: string; code: boolean };

const INLINE_CODE = /`([^`\n]+)`/;

export const splitInlineCode = (text: string): Piece[] =>
  text
    .split(INLINE_CODE)
    .map((piece, index) => ({ text: piece, code: index % 2 === 1 }))
    .filter((piece) => piece.text !== "");
