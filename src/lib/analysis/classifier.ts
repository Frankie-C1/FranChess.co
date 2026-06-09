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
    categories.add("undefended_piece");
  }

  if (loss > 90 && analysis.bestMove && analysis.playedUci !== analysis.bestMove) {
    categories.add("missed_tactic");
  }

  if (loss > 180 && analysis.bestMove && analysis.playedUci !== analysis.bestMove) {
    categories.add("tactical_blunder");
    addTacticalHint(categories, analysis.bestMove);
  }

  if (loss > 160 && analysis.playedMove.includes("x")) {
    categories.add("exchange_blunder");
  }

  if (loss > 100 && hasHangingPiece(before, analysis.color === "w" ? "b" : "w") && !analysis.playedMove.includes("x")) {
    categories.add("ignored_threat");
  }

  if (analysis.phase === "opening" && analysis.ply < 20) {
    const playedPiece = analysis.playedMove.replace(/[+#?!x=].*/g, "")[0];
    const developed = countDevelopedMinorPieces(after, analysis.color);
    const queenMove = playedPiece === "Q" || (/^[a-h]/.test(analysis.playedMove) === false && analysis.playedMove.startsWith("Q"));

    if ((queenMove && analysis.moveNumber <= 10) || previousPieceMoves > 1 || developed < 2) {
      categories.add(previousPieceMoves > 1 ? "bad_development" : "opening_principle");
    }
    if (queenMove && analysis.moveNumber <= 10) categories.add("early_queen");
    if (previousPieceMoves > 1) categories.add("repeated_piece_move");
  }

  if (loss > 90 && analysis.phase !== "endgame" && kingStayedCentral(before, after, analysis.color)) {
    categories.add("king_safety");
  }

  if (loss > 160 && analysis.mateScore !== null && analysis.mateScore < 0) {
    categories.add("allowed_mate_threat");
  }

  if (analysis.phase === "endgame" && loss > 100) {
    categories.add("endgame_error");
  }

  if (loss > 80 && damagesPawnStructure(after, analysis.color)) {
    categories.add("pawn_structure_damage");
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
    return `Du verpasst eine entscheidende Matt- oder Taktikchance. Besser war ${bestMove ?? "der Engine-Kandidat"}.`;
  }
  if (categories.includes("hanging_piece")) {
    return "Du hast eine ungedeckte Figur übersehen; nach dem Zug kann der Gegner Material gewinnen.";
  }
  if (categories.includes("ignored_threat")) {
    return "Die gegnerische Drohung bleibt bestehen. Prüfe vor dem eigenen Plan zuerst, was angegriffen ist.";
  }
  if (categories.includes("missed_fork")) {
    return `Du gibst eine taktische Möglichkeit aus der Hand. Der bessere Kandidat war ${bestMove ?? "ein aktiver Engine-Zug"}.`;
  }
  if (categories.includes("missed_pin") || categories.includes("missed_skewer")) {
    return "Eine Linienfigur konnte Druck auf König, Dame oder Turm aufbauen; dieser Hebel wurde verpasst.";
  }
  if (categories.includes("exchange_blunder")) {
    return "Der Abtausch wirkt aktiv, verliert aber materiell oder positionell zu viel.";
  }
  if (categories.includes("king_safety")) {
    return "Dein König bleibt im Zentrum, während die Stellung offener wird. Sicherheit hatte Vorrang.";
  }
  if (categories.includes("early_queen")) {
    return "Der frühe Damenzug gibt dem Gegner Entwicklungstempi und löst das Hauptproblem nicht.";
  }
  if (categories.includes("repeated_piece_move")) {
    return "Eine Figur zieht mehrfach, bevor die Entwicklung abgeschlossen ist. Das kostet Zeit für Königssicherheit und Zentrum.";
  }
  if (categories.includes("opening_principle") || categories.includes("bad_development")) {
    return "Besser war Entwicklung statt Angriff: Figuren ins Spiel bringen, Zentrum halten und den König sichern.";
  }
  if (categories.includes("endgame_error")) {
    return "Im Endspiel kostet dieser Zug Präzision. Aktivität, Königstellung und Bauernstruktur sollten zuerst geprüft werden.";
  }
  if (categories.includes("pawn_structure_damage")) {
    return "Der Zug schwächt die Bauernstruktur und erzeugt langfristige Ziele für den Gegner.";
  }
  if (categories.includes("time_pressure")) {
    return "Der Fehler entstand in sehr knapper Bedenkzeit. Hier hilft ein einfacheres Entscheidungsraster.";
  }
  if (categories.includes("tactical_blunder")) {
    return "Du gibst dem Gegner eine konkrete taktische Möglichkeit. Suche nach Checks, Captures und Drohungen.";
  }
  if (categories.includes("blunder")) return `Großer Bewertungsverlust von ${Math.round(loss)} Centipawns.`;
  if (categories.includes("mistake")) return `Deutlicher Bewertungsverlust von ${Math.round(loss)} Centipawns.`;
  if (categories.includes("inaccuracy")) return `Kleine Ungenauigkeit mit ${Math.round(loss)} Centipawns Verlust.`;
  return "Solider Zug ohne klare regelbasierte Fehlerkategorie.";
}

function addTacticalHint(categories: Set<MistakeCategory>, bestMove: string): void {
  const from = bestMove.slice(0, 2);
  const to = bestMove.slice(2, 4);
  const fileDistance = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
  const rankDistance = Math.abs(Number(from[1]) - Number(to[1]));

  if ((fileDistance === 1 && rankDistance === 2) || (fileDistance === 2 && rankDistance === 1)) {
    categories.add("missed_fork");
  } else if (fileDistance === 0 || rankDistance === 0 || fileDistance === rankDistance) {
    categories.add(fileDistance === rankDistance ? "missed_skewer" : "missed_pin");
  }
}

function damagesPawnStructure(chess: Chess, color: "w" | "b"): boolean {
  const files = new Map<string, number>();
  for (const piece of chess.board().flat()) {
    if (!piece || piece.color !== color || piece.type !== "p") continue;
    const file = piece.square[0];
    files.set(file, (files.get(file) ?? 0) + 1);
  }
  return [...files.values()].some((count) => count >= 2);
}
