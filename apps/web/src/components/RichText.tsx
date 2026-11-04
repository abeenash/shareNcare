import { type Piece, splitInlineCode } from "../lib/inline-code";

const TextPiece = ({ piece }: { piece: Piece }) =>
  piece.code ? (
    <code className="box-decoration-clone rounded-md bg-base-300 px-1.5 py-0.5 font-mono text-[0.9em] text-primary">
      {piece.text}
    </code>
  ) : (
    piece.text
  );

const RichText = ({ text }: { text: string }) => (
  <>
    {splitInlineCode(text).map((piece, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: pieces come from one string and never move
      <TextPiece key={index} piece={piece} />
    ))}
  </>
);

export default RichText;
