import { Chess } from "chess.js";
import { countDevelopedMinorPieces, hasHangingPiece } from "../chess/position";
import type { MistakeCategory, MoveAnalysis } from "../../types";

interface ClassificationContext {
  before: Chess;
  after: Chess;
  analysis: Omit<MoveAnalysis, "categories" | "explanation">;
  previousPieceMoves: number;
  clock?: string;
}

export function classifyMove(context: ClassificationContext): { categories: MistakeCategory[]; explanation: string } {
  const categories = new Set<MistakeCategory>();
  const { analysis, before, after, previousPieceMoves, clock } = context;
  const loss = analysis.centipawnLoss;

  if (loss > 300) categories.add("blunder");
  else if (loss > 150) categories.add("mistake");
  else if (loss > 70) categories.add("inaccuracy");

  if (analysis.mateScore && Math.abs(analysis.mateScore) <= 5 && analysis.bestMove && analysis.playedUci !== analysis.bestMove) {
    categories.add("missed_mate");
  }

  if (loss > 120 && hasHangingPiece(after, analysis.color)) {
    categories.add("hanging_piece");
  }

  if (loss > 90 && analysis.bestMove && analysis.playedUci !== analysis.bestMove) {
    categories.add("missed_tactic");
  }

  if (analysis.phase === "opening" && analysis.ply < 20) {
    const playedPiece = analysis.playedMove.replace(/[+#?!x=].*/g, "")[0];
    const developed = countDevelopedMinorPieces(after, analysis.color);
    const queenMove = playedPiece === "Q" || /^[a-h]/.test(analysis.playedMove) === false && analysis.playedMove.startsWith("Q");

    if ((queenMove && analysis.moveNumber <= 10) || previousPieceMoves > 1 || developed < 2) {
      categories.add(previousPieceMoves > 1 ? "bad_development" : "opening_principle");
    }
  }

  if (loss > 90 && analysis.phase !== "endgame" && kingStayedCentral(before, after, analysis.color)) {
    categories.add("king_safety");
  }

  if (analysis.phase === "endgame" && loss > 100) {
    categories.add("endgame_error");
  }

  if (clock && loss > 70 && isLowClock(clock)) {
    categories.add("time_pressure");
  }

  return {
    categories: [...categories],
    explanation: explain([...categories], loss, analysis.bestMove)
  };
}

function kingStayedCentral(before: Chess, after: Chess, color: "w" | "b"): boolean {
  const centralSquares = color === "w" ? ["e1", "d1"] : ["e8", "d8"];
  const beforeKing = before.board().flat().find((piece) => piece?.type === "k" && piece.color === color)?.square;
  const afterKing = after.board().flat().find((piece) => piece?.type === "k" && piece.color === color)?.square;
  return Boolean(beforeKing && afterKing && centralSquares.includes(beforeKing) && centralSquares.includes(afterKing));
}

function isLowClock(clock: string): boolean {
  const parts = clock.split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part))) return false;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return seconds <= 45;
}

function explain(categories: MistakeCategory[], loss: number, bestMove: string | null): string {
  if (categories.includes("missed_mate")) {
    return `Stockfish sah eine forcierte Mattchance. Der bessere Kandidat war ${bestMove ?? "der Engine-Zug"}.`;
  }
  if (categories.includes("hanging_piece")) {
    return "Nach dem Zug blieb eigenes Material ungenügend gedeckt und die Bewertung fiel deutlich.";
  }
  if (categories.includes("king_safety")) {
    return "Der König blieb im Zentrum, obwohl Sicherheit wichtiger gewesen wäre.";
  }
  if (categories.includes("opening_principle") || categories.includes("bad_development")) {
    return "Der Zug verletzt frühe Entwicklungsprinzipien: Figurenentwicklung, Zentrum und Königssicherheit hatten Vorrang.";
  }
  if (categories.includes("endgame_error")) {
    return "Im Endspiel kostet dieser Zug wichtige Präzision. Aktivität und Bauernstruktur sollten geprüft werden.";
  }
  if (categories.includes("time_pressure")) {
    return "Der Fehler entstand in sehr knapper Bedenkzeit. Hier hilft ein einfacheres Entscheidungsraster.";
  }
  if (categories.includes("blunder")) return `Großer Bewertungsverlust von ${Math.round(loss)} Centipawns.`;
  if (categories.includes("mistake")) return `Deutlicher Bewertungsverlust von ${Math.round(loss)} Centipawns.`;
  if (categories.includes("inaccuracy")) return `Kleine Ungenauigkeit mit ${Math.round(loss)} Centipawns Verlust.`;
  return "Solider Zug ohne klare regelbasierte Fehlerkategorie.";
}
