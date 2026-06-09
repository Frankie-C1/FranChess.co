import { Chess, type Move, type Square } from "chess.js";
import type { BoardTheme, CapturedMaterial, ColorTheme, EngineCandidateMove } from "../../types";

export type BoardArrow = [Square, Square, string?];
export type SquareStyles = Partial<Record<Square, Record<string, string | number>>>;
export interface BoardPalette {
  light: string;
  dark: string;
}

export function uciToArrow(move: string | null | undefined, color = "rgba(212, 175, 55, 0.82)"): BoardArrow[] {
  if (!move || move.length < 4) return [];
  return [[move.slice(0, 2) as Square, move.slice(2, 4) as Square, color]];
}

export function candidatesToArrows(candidates: EngineCandidateMove[]): BoardArrow[] {
  const colors = [
    "rgba(212, 175, 55, 0.9)",
    "rgba(222, 196, 96, 0.72)",
    "rgba(222, 196, 96, 0.58)",
    "rgba(222, 196, 96, 0.48)",
    "rgba(222, 196, 96, 0.38)"
  ];
  return candidates
    .filter((candidate) => candidate.move.length >= 4)
    .slice(0, 5)
    .map((candidate, index) => [candidate.move.slice(0, 2) as Square, candidate.move.slice(2, 4) as Square, colors[index]] satisfies BoardArrow);
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

export function pieceColorAt(fen: string, square: Square): "w" | "b" | null {
  return new Chess(fen).get(square)?.color ?? null;
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

export function materialFromFen(fen: string): CapturedMaterial {
  const chess = new Chess(fen);
  const remaining: Record<"w" | "b", Record<string, number>> = {
    w: { q: 0, r: 0, b: 0, n: 0, p: 0 },
    b: { q: 0, r: 0, b: 0, n: 0, p: 0 }
  };
  const starting = { q: 1, r: 2, b: 2, n: 2, p: 8 };

  for (const piece of chess.board().flat()) {
    if (!piece || piece.type === "k") continue;
    remaining[piece.color][piece.type] += 1;
  }

  const whiteCaptured = missingPieces(remaining.b, starting, "b");
  const blackCaptured = missingPieces(remaining.w, starting, "w");
  const whiteMaterial = materialValue(whiteCaptured);
  const blackMaterial = materialValue(blackCaptured);

  return {
    white: { captured: whiteCaptured, advantage: whiteMaterial - blackMaterial },
    black: { captured: blackCaptured, advantage: blackMaterial - whiteMaterial }
  };
}

export function formatEval(cp: number | null, mate: number | null): string {
  if (mate !== null) return `M${Math.abs(mate)}`;
  if (cp === null) return "-";
  const pawns = cp / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(1)}`;
}

export function boardColorsFor(boardTheme: BoardTheme, colorTheme: ColorTheme, darkMode: boolean): BoardPalette {
  const resolved = boardTheme === "auto" ? autoBoardTheme(colorTheme, darkMode) : boardTheme;
  const palettes: Record<Exclude<BoardTheme, "auto">, BoardPalette> = {
    green: { light: "#eeeed2", dark: "#769656" },
    wood: { light: "#ead7b7", dark: "#b4875d" },
    gray: { light: "#d8d8d2", dark: "#8b9084" },
    blueGray: { light: "#d7e0df", dark: "#7895a3" },
    dark: { light: "#b8aea0", dark: "#5a5248" }
  };
  return palettes[resolved];
}

function autoBoardTheme(colorTheme: ColorTheme, darkMode: boolean): Exclude<BoardTheme, "auto"> {
  if (colorTheme === "blueGray") return "blueGray";
  if (colorTheme === "gray") return "gray";
  if (colorTheme === "wood" || colorTheme === "nightBrown" || colorTheme === "gold") return "wood";
  if (darkMode && colorTheme === "purple") return "dark";
  return "green";
}

function missingPieces(remaining: Record<string, number>, starting: Record<string, number>, color: "w" | "b"): string[] {
  const order = ["q", "r", "b", "n", "p"];
  const symbols: Record<string, string> =
    color === "w"
      ? { q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" }
      : { q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  return order.flatMap((piece) => Array.from({ length: Math.max(0, starting[piece] - (remaining[piece] ?? 0)) }, () => symbols[piece]));
}

function materialValue(pieces: string[]): number {
  const values: Record<string, number> = {
    "♕": 9,
    "♛": 9,
    "♖": 5,
    "♜": 5,
    "♗": 3,
    "♝": 3,
    "♘": 3,
    "♞": 3,
    "♙": 1,
    "♟": 1
  };
  return pieces.reduce((total, piece) => total + (values[piece] ?? 0), 0);
}
