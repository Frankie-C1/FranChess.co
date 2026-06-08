import JSZip from "jszip";
import type { CoachProfile, MoveAnalysis, StoredGame } from "../../types";
import { buildCoachProfile } from "../analysis/profile";

export async function createCoachExport(games: StoredGame[]): Promise<Blob> {
  const zip = new JSZip();
  const profile = buildCoachProfile(games);
  const analysis = games.flatMap((game) => game.analysis);
  const mistakes = analysis.filter((move) => move.categories.length > 0);

  zip.file("games.pgn", games.map((game) => game.pgn).join("\n\n"));
  zip.file("analysis.json", JSON.stringify(analysis, null, 2));
  zip.file("mistakes.csv", toCsv(mistakes));
  zip.file("profile.json", JSON.stringify(profile, null, 2));
  zip.file("summary.md", createSummary(games, profile));

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: MoveAnalysis[]): string {
  const header = [
    "gameId",
    "moveNumber",
    "color",
    "playedMove",
    "bestMove",
    "evalBefore",
    "evalAfter",
    "centipawnLoss",
    "categories",
    "explanation"
  ];
  const body = rows.map((move) =>
    [
      move.gameId,
      move.moveNumber,
      move.color,
      move.playedMove,
      move.bestMove ?? "",
      move.evalBefore ?? "",
      move.evalAfter ?? "",
      move.centipawnLoss,
      move.categories.join("|"),
      move.explanation
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...body].join("\n");
}

function csvEscape(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function createSummary(games: StoredGame[], profile: CoachProfile): string {
  const dates = games.map((game) => game.metadata.date).filter(Boolean).sort();
  const ratings = games
    .flatMap((game) => [game.metadata.whiteElo, game.metadata.blackElo])
    .filter((rating): rating is number => typeof rating === "number");
  const ratingRange = ratings.length ? `${Math.min(...ratings)}-${Math.max(...ratings)}` : "nicht vorhanden";

  return `# FranChess.co Summary

Spielername: ${profile.playerName}
Anzahl Partien: ${games.length}
Zeitraum: ${dates[0] ?? "unbekannt"} bis ${dates[dates.length - 1] ?? "unbekannt"}
Ratingbereich: ${ratingRange}
Winrate: ${profile.winrate}%
Average Centipawn Loss: ${profile.averageCentipawnLoss}

## Top-Fehlerkategorien
${profile.topCategories.map((item) => `- ${item.category}: ${item.count}`).join("\n") || "- Keine Analyse vorhanden"}

## Typische Eröffnungen
${profile.openingCounts.map((item) => `- ${item.opening}: ${item.count}`).join("\n") || "- Keine Eröffnungen vorhanden"}

## Häufigste kritische Muster
${profile.diagnosis}

## Frage an den Coach
Analysiere meine Fehler und erstelle einen Trainingsplan Richtung 2000 Elo.
`;
}
