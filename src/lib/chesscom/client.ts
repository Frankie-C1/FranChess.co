import { parsePgnBatch } from "../chess/pgn";
import type { StoredGame } from "../../types";

export type ChessComTimeClass = "all" | "rapid" | "blitz" | "bullet";
export type ChessComPeriod = "all" | "last-month" | "last-year";

export interface ChessComImportFilters {
  timeClass: ChessComTimeClass;
  period: ChessComPeriod;
}

export interface ChessComProgress {
  phase: "idle" | "archives" | "month" | "done" | "error";
  message: string;
  archivesFound?: number;
  monthIndex?: number;
  monthTotal?: number;
  importedCount?: number;
}

interface ArchivesResponse {
  archives?: string[];
}

export class ChessComImportError extends Error {
  constructor(
    message: string,
    public readonly code: "not-found" | "no-archives" | "unreachable" | "rate-limit" | "invalid-response"
  ) {
    super(message);
  }
}

export async function importChessComGames(
  username: string,
  filters: ChessComImportFilters,
  onProgress: (progress: ChessComProgress) => void
): Promise<StoredGame[]> {
  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername) return [];

  onProgress({ phase: "archives", message: "Archive werden gesucht..." });
  const archiveEndpoint = `https://api.chess.com/pub/player/${encodeURIComponent(cleanUsername.toLowerCase())}/games/archives`;
  const archiveResponse = await fetchChessCom(archiveEndpoint, "json");
  const archives = normalizeArchives(archiveResponse, cleanUsername);
  const filteredArchives = filterArchives(archives, filters.period);

  if (filteredArchives.length === 0) {
    throw new ChessComImportError("Keine Archive für den gewählten Zeitraum gefunden.", "no-archives");
  }

  onProgress({
    phase: "archives",
    message: `${filteredArchives.length} Archiv(e) gefunden.`,
    archivesFound: filteredArchives.length
  });

  const imported: StoredGame[] = [];

  for (let index = 0; index < filteredArchives.length; index += 1) {
    const archiveUrl = filteredArchives[index];
    onProgress({
      phase: "month",
      message: `Monat ${index + 1} von ${filteredArchives.length} geladen...`,
      archivesFound: filteredArchives.length,
      monthIndex: index + 1,
      monthTotal: filteredArchives.length,
      importedCount: imported.length
    });

    const pgn = await fetchChessCom(`${archiveUrl}/pgn`, "text");
    const parsed = parsePgnBatch(pgn)
      .filter((game) => matchesTimeClass(game, filters.timeClass))
      .map((game) => ({
        ...game,
        source: {
          provider: "chesscom" as const,
          url: game.metadata.link || game.metadata.site || archiveUrl,
          importedBy: cleanUsername
        }
      }));

    imported.push(...parsed);
  }

  onProgress({
    phase: "done",
    message: `${imported.length} Partie(n) importiert.`,
    archivesFound: filteredArchives.length,
    monthIndex: filteredArchives.length,
    monthTotal: filteredArchives.length,
    importedCount: imported.length
  });

  return imported;
}

async function fetchChessCom(url: string, responseType: "json"): Promise<ArchivesResponse>;
async function fetchChessCom(url: string, responseType: "text"): Promise<string>;
async function fetchChessCom(url: string, responseType: "json" | "text"): Promise<ArchivesResponse | string> {
  const direct = await request(url).catch(() => null);
  const response = direct ?? (await request(`/api/chesscom?url=${encodeURIComponent(url)}`).catch(() => null));

  if (!response) {
    throw new ChessComImportError("Chess.com API ist nicht erreichbar.", "unreachable");
  }

  if (response.status === 404) {
    throw new ChessComImportError("Chess.com Username nicht gefunden.", "not-found");
  }

  if (response.status === 429) {
    throw new ChessComImportError("Chess.com Rate-Limit erreicht. Bitte später erneut versuchen.", "rate-limit");
  }

  if (!response.ok) {
    throw new ChessComImportError("Chess.com API ist nicht erreichbar.", "unreachable");
  }

  return responseType === "json" ? (response.json() as Promise<ArchivesResponse>) : response.text();
}

async function request(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8"
    }
  });
}

function normalizeArchives(response: ArchivesResponse, username: string): string[] {
  if (!Array.isArray(response.archives)) {
    throw new ChessComImportError(`Keine Archivdaten für ${username} erhalten.`, "invalid-response");
  }
  if (response.archives.length === 0) {
    throw new ChessComImportError("Dieser Chess.com Nutzer hat keine öffentlichen Archive.", "no-archives");
  }
  return response.archives;
}

function filterArchives(archives: string[], period: ChessComPeriod): string[] {
  if (period === "all") return archives;
  if (period === "last-month") return archives.slice(-1);

  const now = new Date();
  const min = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  min.setUTCMonth(min.getUTCMonth() - 11);

  return archives.filter((archive) => {
    const match = archive.match(/\/games\/(\d{4})\/(\d{2})$/);
    if (!match) return false;
    const archiveDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    return archiveDate >= min;
  });
}

function matchesTimeClass(game: StoredGame, timeClass: ChessComTimeClass): boolean {
  if (timeClass === "all") return true;
  return classifyTimeControl(game.metadata.timeControl) === timeClass;
}

function classifyTimeControl(timeControl?: string): ChessComTimeClass | "daily" | "unknown" {
  if (!timeControl || timeControl === "-") return "unknown";
  const baseSeconds = Number.parseInt(timeControl.split("+")[0], 10);
  if (!Number.isFinite(baseSeconds)) return "unknown";
  if (baseSeconds < 180) return "bullet";
  if (baseSeconds < 600) return "blitz";
  if (baseSeconds < 86400) return "rapid";
  return "daily";
}
