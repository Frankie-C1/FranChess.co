import { Chess, type Move, type Square } from "chess.js";

export type BoardArrow = [Square, Square, string?];
export type SquareStyles = Partial<Record<Square, Record<string, string | number>>>;

export function uciToArrow(move: string | null | undefined, color = "rgba(212, 175, 55, 0.82)"): BoardArrow[] {
  if (!move || move.length < 4) return [];
  return [[move.slice(0, 2) as Square, move.slice(2, 4) as Square, color]];
}

export function legalTargets(fen: string, square: Square): Move[] {
  try {
    return new Chess(fen).moves({ square, verbose: true });
  } catch {
    return [];
  }
}

export function buildSquareStyles({
  fen,
  selectedSquare,
  showLegalMoves
}: {
  fen: string;
  selectedSquare: Square | null;
  showLegalMoves: boolean;
}): SquareStyles {
  if (!selectedSquare) return {};

  const styles: SquareStyles = {
    [selectedSquare]: {
      boxShadow: "inset 0 0 0 3px rgba(95, 143, 69, 0.55)"
    }
  };

  if (!showLegalMoves) return styles;

  for (const move of legalTargets(fen, selectedSquare)) {
    styles[move.to] = move.captured
      ? {
          boxShadow: "inset 0 0 0 4px rgba(80, 80, 80, 0.26), inset 0 0 0 999px rgba(255,255,255,0.03)"
        }
      : {
          background: "radial-gradient(circle, rgba(70, 70, 70, 0.32) 0 18%, transparent 19%)"
        };
  }

  return styles;
}

export function canSelectPiece(fen: string, square: Square, allowOpponentMoves: boolean, ownColor?: "w" | "b"): boolean {
  const chess = new Chess(fen);
  const piece = chess.get(square);
  if (!piece) return false;
  if (ownColor && piece.color !== ownColor) return false;
  return allowOpponentMoves || piece.color === chess.turn();
}

export function tryMove(fen: string, from: Square, to: Square): { fen: string; san: string; uci: string } | null {
  const chess = new Chess(fen);
  const move = chess.move({ from, to, promotion: "q" });
  if (!move) return null;
  return {
    fen: chess.fen(),
    san: move.san,
    uci: `${move.from}${move.to}${move.promotion ?? ""}`
  };
}
