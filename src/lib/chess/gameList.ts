import type { StoredGame } from "../../types";

export type GameSortOrder = "desc" | "asc";

export function sortGamesByDate(games: StoredGame[], order: GameSortOrder): StoredGame[] {
  const direction = order === "desc" ? -1 : 1;
  return [...games].sort((a, b) => {
    const aTime = gameDateTime(a);
    const bTime = gameDateTime(b);
    if (aTime === null && bTime === null) return b.importedAt.localeCompare(a.importedAt);
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    if (aTime === bTime) return b.importedAt.localeCompare(a.importedAt);
    return (aTime - bTime) * direction;
  });
}

export function filterGamesByPlayer(games: StoredGame[], query: string): StoredGame[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return games;
  return games.filter((game) => {
    return game.metadata.white.toLowerCase().includes(needle) || game.metadata.black.toLowerCase().includes(needle);
  });
}

export function gameDateTime(game: StoredGame): number | null {
  const date = parsePgnDate(game.metadata.date);
  return date?.getTime() ?? null;
}

export function parsePgnDate(value: string | undefined): Date | null {
  if (!value || value.includes("?")) return null;
  const normalized = value.trim().replace(/\./g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}
