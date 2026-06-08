import type { CoachProfile, MistakeCategory, MovePhase, StoredGame } from "../../types";
import { getPlayerResult } from "../chess/pgn";

export function buildCoachProfile(games: StoredGame[]): CoachProfile {
  const analyzed = games.filter((game) => game.analysis.length > 0);
  const allMoves = analyzed.flatMap((game) => game.analysis);
  const mistakes = allMoves.filter((move) => move.categories.length > 0);
  const categories = countBy(mistakes.flatMap((move) => move.categories));
  const openings = countBy(games.map((game) => game.metadata.opening || "Unbekannt"));
  const wins = games.filter((game) => getPlayerResult(game, "white") === "win" || getPlayerResult(game, "black") === "win").length;
  const decisive = games.filter((game) => game.metadata.result !== "*").length;

  const topCategories = Object.entries(categories)
    .map(([category, count]) => ({ category: category as MistakeCategory, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    playerName: inferPlayerName(games),
    gameCount: games.length,
    winrate: decisive ? Math.round((wins / decisive) * 100) : 0,
    averageCentipawnLoss: allMoves.length
      ? Math.round(allMoves.reduce((total, move) => total + move.centipawnLoss, 0) / allMoves.length)
      : 0,
    topCategories,
    openingCounts: Object.entries(openings)
      .map(([opening, count]) => ({ opening, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    diagnosis: diagnose(topCategories)
  };
}

export function phaseBreakdown(games: StoredGame[]): Record<MovePhase, number> {
  const result: Record<MovePhase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  for (const move of games.flatMap((game) => game.analysis)) {
    if (move.categories.length > 0) result[move.phase] += 1;
  }
  return result;
}

export function colorPerformance(games: StoredGame[]): { white: number; black: number } {
  const whiteGames = games.filter((game) => game.metadata.result !== "*");
  const blackGames = whiteGames;
  const whiteWins = whiteGames.filter((game) => game.metadata.result === "1-0").length;
  const blackWins = blackGames.filter((game) => game.metadata.result === "0-1").length;

  return {
    white: whiteGames.length ? Math.round((whiteWins / whiteGames.length) * 100) : 0,
    black: blackGames.length ? Math.round((blackWins / blackGames.length) * 100) : 0
  };
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function inferPlayerName(games: StoredGame[]): string {
  const names = games.flatMap((game) => [game.metadata.white, game.metadata.black]).filter((name) => name !== "Unbekannt");
  return names[0] ?? "FranChess.co-Spieler";
}

function diagnose(topCategories: Array<{ category: MistakeCategory; count: number }>): string {
  const top = topCategories[0]?.category;
  if (!top) return "Noch keine klare Elo-Bremse. Analysiere ein paar Partien, dann wird das Profil schärfer.";
  const map: Record<MistakeCategory, string> = {
    blunder: "Größte Elo-Bremse: einzügige Einsteller und unzureichende Kandidatenprüfung.",
    mistake: "Größte Elo-Bremse: taktische Wendepunkte werden zu spät erkannt.",
    inaccuracy: "Größte Elo-Bremse: viele kleine Ungenauigkeiten sammeln sich zu Druck an.",
    missed_mate: "Größte Elo-Bremse: Mattmotive werden nicht konsequent gesucht.",
    missed_tactic: "Größte Elo-Bremse: taktische Ressourcen bleiben ungenutzt.",
    hanging_piece: "Größte Elo-Bremse: Material hängt zu oft ungedeckt.",
    king_safety: "Größte Elo-Bremse: Königssicherheit wird gegen Aktivität unterschätzt.",
    bad_development: "Größte Elo-Bremse: Figuren werden mehrfach gezogen, bevor die Entwicklung abgeschlossen ist.",
    opening_principle: "Größte Elo-Bremse: Eröffnungsprinzipien werden zu oft verletzt.",
    endgame_error: "Größte Elo-Bremse: Endspielpräzision und Aktivität kosten Punkte.",
    time_pressure: "Größte Elo-Bremse: Entscheidungen unter Zeitdruck brauchen ein robusteres Raster."
  };
  return map[top];
}
