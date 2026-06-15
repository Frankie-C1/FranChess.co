import type { AppSettings, CoachUserProfile, MoveAnalysis, StoredGame } from "../../types";
import { mergeUniqueGames } from "../chess/dedupe";
import { parsePgnBatch } from "../chess/pgn";
import { supabase } from "./supabase";

const puzzleHistoryKey = "franchess.puzzleHistory.v1";
const openingProgressKey = "franchess.openingProgress.v1";
const migrationPrefix = "franchess.cloudMigrated.v1.";

interface CloudGameRow {
  id: string;
  source: string | null;
  pgn: string;
  white: string | null;
  black: string | null;
  result: string | null;
  date: string | null;
  time_control: string | null;
  opening: string | null;
  favorite: boolean | null;
  created_at: string;
}

interface CloudAnalysisRow {
  game_id: string;
  analysis_json: MoveAnalysis[] | null;
  created_at: string;
}

export interface CloudSnapshot {
  games: StoredGame[];
  settings: AppSettings | null;
}

export async function loginOrCreateProfile(usernameInput: string): Promise<CoachUserProfile> {
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  const username = normalizeUsername(usernameInput);
  if (!username) throw new Error("Der Benutzername muss 3 bis 32 Zeichen lang sein.");

  const { data: existing, error: findError } = await supabase
    .from("profiles")
    .select("id, username, chesscom_username, created_at, last_seen")
    .ilike("username", username)
    .maybeSingle();
  if (findError) throw findError;

  const now = new Date().toISOString();
  if (existing) {
    await supabase.from("profiles").update({ last_seen: now }).eq("id", existing.id);
    return {
      id: existing.id,
      username: existing.username,
      chessComUsername: existing.chesscom_username ?? undefined,
      createdAt: existing.created_at,
      lastSeen: now
    };
  }

  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id, username, chesscom_username: username, created_at: now, last_seen: now })
    .select("id, username, chesscom_username, created_at, last_seen")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    username: data.username,
    chessComUsername: data.chesscom_username ?? undefined,
    createdAt: data.created_at,
    lastSeen: data.last_seen
  };
}

export async function loadCloudSnapshot(profileId: string, defaults: AppSettings): Promise<CloudSnapshot> {
  if (!supabase) return { games: [], settings: null };
  const [gamesResult, analysesResult, settingsResult, puzzleResult, openingResult] = await Promise.all([
    supabase.from("games").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }),
    supabase.from("analyses").select("game_id, analysis_json, created_at").eq("profile_id", profileId),
    supabase.from("user_settings").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("puzzle_progress").select("puzzle_id, solved, attempts, last_seen").eq("profile_id", profileId),
    supabase.from("opening_progress").select("opening_id, progress_json, updated_at").eq("profile_id", profileId)
  ]);
  if (gamesResult.error) throw gamesResult.error;
  if (analysesResult.error) throw analysesResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (puzzleResult.error) throw puzzleResult.error;
  if (openingResult.error) throw openingResult.error;

  mergeCloudProgress(puzzleResult.data ?? [], openingResult.data ?? []);

  const analyses = new Map(
    ((analysesResult.data ?? []) as CloudAnalysisRow[]).map((row) => [row.game_id, Array.isArray(row.analysis_json) ? row.analysis_json : []])
  );
  const games = ((gamesResult.data ?? []) as CloudGameRow[]).flatMap((row) => {
    const parsed = parsePgnBatch(row.pgn)[0];
    if (!parsed) return [];
    return [{
      ...parsed,
      id: row.id,
      importedAt: row.created_at,
      favorite: Boolean(row.favorite),
      source: row.source === "chesscom" ? { provider: "chesscom" as const } : { provider: "pgn" as const },
      metadata: {
        ...parsed.metadata,
        white: row.white || parsed.metadata.white,
        black: row.black || parsed.metadata.black,
        result: isGameResult(row.result) ? row.result : parsed.metadata.result,
        date: row.date || parsed.metadata.date,
        timeControl: row.time_control || parsed.metadata.timeControl,
        opening: row.opening || parsed.metadata.opening
      },
      analysis: analyses.get(row.id) ?? []
    }];
  });

  const row = settingsResult.data;
  const settings = row ? {
    ...defaults,
    darkMode: row.dark_mode ?? defaults.darkMode,
    colorTheme: row.color_theme ?? defaults.colorTheme,
    boardTheme: row.board_theme ?? defaults.boardTheme,
    layoutMode: row.layout_mode ?? defaults.layoutMode,
    engineElo: row.engine_elo === "max" ? "max" : (Number(row.engine_elo) || defaults.engineElo),
    showLegalMoves: row.show_legal_moves ?? defaults.showLegalMoves,
    ...(row.other_settings ?? {})
  } as AppSettings : null;
  return { games, settings };
}

export async function pushCloudSnapshot(profileId: string, games: StoredGame[], settings: AppSettings): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();
  const gameRows = games.map((game) => ({
    id: game.id,
    profile_id: profileId,
    source: game.source?.provider ?? "pgn",
    pgn: game.pgn,
    white: game.metadata.white,
    black: game.metadata.black,
    result: game.metadata.result,
    date: game.metadata.date || null,
    time_control: game.metadata.timeControl ?? null,
    opening: game.metadata.opening ?? null,
    favorite: Boolean(game.favorite),
    created_at: game.importedAt || now
  }));
  if (gameRows.length) {
    const { error } = await supabase.from("games").upsert(gameRows, { onConflict: "id" });
    if (error) throw error;
  }
  const ids = games.map((game) => game.id);
  const deleteQuery = supabase.from("games").delete().eq("profile_id", profileId);
  const { error: deleteError } = ids.length ? await deleteQuery.not("id", "in", `(${ids.join(",")})`) : await deleteQuery;
  if (deleteError) throw deleteError;

  const analysisRows = games.filter((game) => game.analysis.length > 0).map((game) => ({
    id: stableAnalysisId(game.id),
    profile_id: profileId,
    game_id: game.id,
    analysis_json: game.analysis,
    accuracy_white: null,
    accuracy_black: null,
    estimated_elo_white: null,
    estimated_elo_black: null,
    created_at: game.analyzedAt ?? now
  }));
  if (analysisRows.length) {
    const { error } = await supabase.from("analyses").upsert(analysisRows, { onConflict: "profile_id,game_id" });
    if (error) throw error;
  }

  const { error: settingsError } = await supabase.from("user_settings").upsert({
    profile_id: profileId,
    dark_mode: settings.darkMode,
    color_theme: settings.colorTheme,
    board_theme: settings.boardTheme,
    layout_mode: settings.layoutMode,
    engine_elo: String(settings.engineElo),
    show_legal_moves: settings.showLegalMoves,
    other_settings: {
      allowPlayedPuzzles: settings.allowPlayedPuzzles,
      allowOpponentMoves: settings.allowOpponentMoves,
      coachSettingsCollapsed: settings.coachSettingsCollapsed
    }
  }, { onConflict: "profile_id" });
  if (settingsError) throw settingsError;

  await syncProgress(profileId);
  await supabase.from("profiles").update({ last_seen: now }).eq("id", profileId);
}

export function mergeSnapshots(localGames: StoredGame[], cloudGames: StoredGame[]): StoredGame[] {
  const merged = mergeUniqueGames(cloudGames, localGames).games;
  const localById = new Map(localGames.map((game) => [game.id, game]));
  return merged.map((game) => {
    const local = localById.get(game.id);
    return local ? { ...game, ...local, favorite: Boolean(game.favorite || local.favorite), analysis: local.analysis.length ? local.analysis : game.analysis } : game;
  });
}

export function hasLocalUserData(games: StoredGame[]): boolean {
  return games.length > 0 || Boolean(window.localStorage.getItem(puzzleHistoryKey)) || Boolean(window.localStorage.getItem(openingProgressKey));
}

export function hasMigrated(profileId: string): boolean {
  return window.localStorage.getItem(`${migrationPrefix}${profileId}`) === "yes";
}

export function markMigrated(profileId: string): void {
  window.localStorage.setItem(`${migrationPrefix}${profileId}`, "yes");
}

function normalizeUsername(value: string): string {
  const username = value.trim().replace(/^@/, "");
  return /^[a-zA-Z0-9_.-]{3,32}$/.test(username) ? username : "";
}

async function syncProgress(profileId: string): Promise<void> {
  if (!supabase) return;
  const puzzleHistory = readJson<Array<{ puzzleId: string; playedAt: string; solved: boolean }>>(puzzleHistoryKey, []);
  if (puzzleHistory.length) {
    const counts = new Map<string, { attempts: number; solved: boolean; lastSeen: string }>();
    for (const entry of puzzleHistory) {
      const current = counts.get(entry.puzzleId) ?? { attempts: 0, solved: false, lastSeen: entry.playedAt };
      current.attempts += 1;
      current.solved ||= entry.solved;
      if (entry.playedAt > current.lastSeen) current.lastSeen = entry.playedAt;
      counts.set(entry.puzzleId, current);
    }
    await supabase.from("puzzle_progress").upsert([...counts].map(([puzzleId, value]) => ({
      profile_id: profileId,
      puzzle_id: puzzleId,
      solved: value.solved,
      attempts: value.attempts,
      last_seen: value.lastSeen
    })), { onConflict: "profile_id,puzzle_id" });
  }

  const openingProgress = readJson<Array<{ lineId: string; path: string[]; updatedAt: string }>>(openingProgressKey, []);
  if (openingProgress.length) {
    await supabase.from("opening_progress").upsert(openingProgress.map((entry) => ({
      profile_id: profileId,
      opening_id: entry.lineId,
      progress_json: { path: entry.path },
      updated_at: entry.updatedAt
    })), { onConflict: "profile_id,opening_id" });
  }

  const trainingData = { generatedAt: new Date().toISOString() };
  await supabase.from("training_progress").upsert({ profile_id: profileId, data: trainingData }, { onConflict: "profile_id" });
}

function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function mergeCloudProgress(
  puzzleRows: Array<{ puzzle_id: string; solved: boolean; attempts: number; last_seen: string }>,
  openingRows: Array<{ opening_id: string; progress_json: { path?: string[] } | null; updated_at: string }>
): void {
  const localPuzzles = readJson<Array<{ puzzleId: string; playedAt: string; solved: boolean }>>(puzzleHistoryKey, []);
  const seenPuzzles = new Set(localPuzzles.map((entry) => entry.puzzleId));
  for (const row of puzzleRows) {
    if (!seenPuzzles.has(row.puzzle_id)) localPuzzles.push({ puzzleId: row.puzzle_id, playedAt: row.last_seen, solved: row.solved });
  }
  if (puzzleRows.length) window.localStorage.setItem(puzzleHistoryKey, JSON.stringify(localPuzzles));

  const localOpenings = readJson<Array<{ lineId: string; path: string[]; updatedAt: string }>>(openingProgressKey, []);
  const byId = new Map(localOpenings.map((entry) => [entry.lineId, entry]));
  for (const row of openingRows) {
    const current = byId.get(row.opening_id);
    if (!current || row.updated_at > current.updatedAt) byId.set(row.opening_id, { lineId: row.opening_id, path: row.progress_json?.path ?? [], updatedAt: row.updated_at });
  }
  if (openingRows.length) window.localStorage.setItem(openingProgressKey, JSON.stringify([...byId.values()]));
}

function stableAnalysisId(gameId: string): string {
  return gameId;
}

function isGameResult(value: string | null): value is StoredGame["metadata"]["result"] {
  return value === "1-0" || value === "0-1" || value === "1/2-1/2" || value === "*";
}
