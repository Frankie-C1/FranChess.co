import { Chess } from "chess.js";
import type { GameMetadata, GameResult, StoredGame } from "../../types";

const resultValues = new Set(["1-0", "0-1", "1/2-1/2", "*"]);

export function splitPgnBatch(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const starts = [...normalized.matchAll(/\n(?=\[Event\s+")/g)].map((match) => match.index + 1);
  if (starts.length === 0) return [normalized];

  const chunks: string[] = [];
  let cursor = 0;
  for (const start of starts) {
    chunks.push(normalized.slice(cursor, start).trim());
    cursor = start;
  }
  chunks.push(normalized.slice(cursor).trim());
  return chunks.filter(Boolean);
}

export function parsePgnBatch(raw: string): StoredGame[] {
  return splitPgnBatch(raw).flatMap((pgn) => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn, { strict: false });
      const headers = chess.getHeaders();
      const moves = chess.history();

      if (moves.length === 0) return [];

      return [
        {
          id: crypto.randomUUID(),
          pgn,
          metadata: headersToMetadata(headers),
          moves,
          importedAt: new Date().toISOString(),
          analysis: []
        }
      ];
    } catch {
      return [];
    }
  });
}

function headersToMetadata(headers: Record<string, string>): GameMetadata {
  const result = resultValues.has(headers.Result) ? (headers.Result as GameResult) : "*";

  return {
    white: headers.White || "Unbekannt",
    black: headers.Black || "Unbekannt",
    result,
    date: headers.Date || "",
    timeControl: headers.TimeControl || headers.Time || undefined,
    opening: headers.Opening || headers.ECO || undefined,
    event: headers.Event || undefined,
    site: headers.Site || undefined,
    link: headers.Link || undefined,
    whiteElo: toNumber(headers.WhiteElo),
    blackElo: toNumber(headers.BlackElo)
  };
}

function toNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getPlayerResult(game: StoredGame, color: "white" | "black"): "win" | "loss" | "draw" | "unknown" {
  if (game.metadata.result === "1/2-1/2") return "draw";
  if (game.metadata.result === "*") return "unknown";
  if (color === "white") return game.metadata.result === "1-0" ? "win" : "loss";
  return game.metadata.result === "0-1" ? "win" : "loss";
}
