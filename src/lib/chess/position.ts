import { Chess, type Square } from "chess.js";
import type { MovePhase } from "../../types";

const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0
};

export function estimatePosition(fen: string): number {
  const chess = new Chess(fen);
  let score = 0;

  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = pieceValues[piece.type] ?? 0;
      score += piece.color === "w" ? value : -value;
    }
  }

  const turn = chess.turn();
  const mobility = chess.moves().length * 2;
  score += turn === "w" ? mobility : -mobility;
  return score;
}

export function getPhase(chess: Chess, ply: number): MovePhase {
  if (ply < 20) return "opening";

  const material = chess
    .board()
    .flat()
    .reduce((total, piece) => {
      if (!piece || piece.type === "k") return total;
      return total + (pieceValues[piece.type] ?? 0);
    }, 0);

  return material <= 2600 ? "endgame" : "middlegame";
}

export function hasHangingPiece(chess: Chess, color: "w" | "b"): boolean {
  const opponent = color === "w" ? "b" : "w";

  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== color || piece.type === "k") continue;
      const square = piece.square as Square;
      if (chess.isAttacked(square, opponent) && !chess.isAttacked(square, color)) {
        return true;
      }
    }
  }

  return false;
}

export function countDevelopedMinorPieces(chess: Chess, color: "w" | "b"): number {
  const homeRank = color === "w" ? "1" : "8";
  return chess
    .board()
    .flat()
    .filter((piece) => piece && piece.color === color && ["n", "b"].includes(piece.type) && !piece.square.endsWith(homeRank))
    .length;
}
