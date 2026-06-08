import type { StoredGame } from "../../types";

export function gameFingerprint(game: StoredGame): string {
  const url = normalizeUrl(game.metadata.link || game.metadata.site || game.source?.url);
  if (url) return `url:${url}`;

  return [
    "moves",
    normalizeText(game.metadata.date),
    normalizeText(game.metadata.white),
    normalizeText(game.metadata.black),
    normalizeText(game.metadata.result),
    game.moves.join(" ")
  ].join("|");
}

export function mergeUniqueGames(existing: StoredGame[], incoming: StoredGame[]): { games: StoredGame[]; added: StoredGame[]; skipped: number } {
  const seen = new Set(existing.map(gameFingerprint));
  const added: StoredGame[] = [];

  for (const game of incoming) {
    const fingerprint = gameFingerprint(game);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    added.push(game);
  }

  return {
    games: [...added, ...existing],
    added,
    skipped: incoming.length - added.length
  };
}

function normalizeUrl(value?: string): string {
  if (!value) return "";
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function normalizeText(value?: string): string {
  return (value || "").trim().toLowerCase();
}
