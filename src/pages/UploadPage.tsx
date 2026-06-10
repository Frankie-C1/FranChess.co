import { useEffect, useState } from "react";
import { CloudDownload, Shield, Star, Upload } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { mergeUniqueGames } from "../lib/chess/dedupe";
import { parsePgnBatch } from "../lib/chess/pgn";
import {
  ChessComImportError,
  importChessComGames,
  type ChessComImportFilters,
  type ChessComPeriod,
  type ChessComProgress,
  type ChessComTimeClass
} from "../lib/chesscom/client";
import { filterGamesByPlayer, sortGamesByDate, type GameSortOrder } from "../lib/chess/gameList";
import { loadProfile, saveProfile } from "../lib/storage/profile";
import type { StoredGame } from "../types";

export function UploadPage({
  games,
  onGamesChange,
  onOpenGame,
  onToggleFavorite
}: {
  games: StoredGame[];
  onGamesChange: (games: StoredGame[]) => Promise<void>;
  onOpenGame: (id: string) => void;
  onToggleFavorite: (id: string) => Promise<void>;
}) {
  const [message, setMessage] = useState<string>("");
  const [chessComUsername, setChessComUsername] = useState("");
  const [timeClass, setTimeClass] = useState<ChessComTimeClass>("all");
  const [period, setPeriod] = useState<ChessComPeriod>("last-month");
  const [progress, setProgress] = useState<ChessComProgress>({ phase: "idle", message: "" });
  const [isImporting, setIsImporting] = useState(false);
  const [sortOrder, setSortOrder] = useState<GameSortOrder>("desc");
  const [playerSearch, setPlayerSearch] = useState("");
  const visibleGames = filterGamesByPlayer(sortGamesByDate(games, sortOrder), playerSearch);

  useEffect(() => {
    setChessComUsername(loadProfile().chessComUsername ?? "");
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const imported: StoredGame[] = [];

    for (const file of Array.from(files)) {
      const text = await file.text();
      imported.push(...parsePgnBatch(text));
    }

    if (imported.length === 0) {
      setMessage("Keine gültige PGN-Partie gefunden.");
      return;
    }

    const merged = mergeUniqueGames(games, imported);
    await onGamesChange(merged.games);
    if (merged.added[0]) onOpenGame(merged.added[0].id);
    setMessage(`${merged.added.length} Partie(n) importiert. ${merged.skipped} Duplikat(e) übersprungen.`);
  }

  async function handleChessComImport() {
    const username = chessComUsername.trim().replace(/^@/, "");
    if (!username) {
      setMessage("Bitte gib einen Chess.com Username ein.");
      return;
    }

    const filters: ChessComImportFilters = { timeClass, period };
    setIsImporting(true);
    setMessage("");

    try {
      const imported = await importChessComGames(username, filters, setProgress);
      const merged = mergeUniqueGames(games, imported);
      await onGamesChange(merged.games);
      saveProfile({ ...loadProfile(), chessComUsername: username });
      if (merged.added[0]) onOpenGame(merged.added[0].id);
      setMessage(`${merged.added.length} Chess.com Partie(n) importiert. ${merged.skipped} Duplikat(e) übersprungen.`);
    } catch (error) {
      setProgress({ phase: "error", message: getChessComErrorMessage(error) });
      setMessage(getChessComErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-2xl font-semibold">PGN Upload</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
          Mehrere PGN-Dateien sind möglich. FranChess.co liest Metadaten, speichert die Partien lokal und bereitet sie für die Analyse vor.
        </p>
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:hover:bg-stone-900">
          <Upload size={28} className="text-[#5f8f45]" />
          <span className="mt-3 font-medium">PGN-Dateien auswählen</span>
          <span className="mt-1 text-sm text-stone-500">.pgn oder Textdateien</span>
          <input className="sr-only" type="file" multiple accept=".pgn,.txt" onChange={(event) => void handleFiles(event.target.files)} />
        </label>
        {message && <p className="mt-4 rounded-md bg-[#eef6ea] px-3 py-2 text-sm text-[#3f6b2e] dark:bg-[#1f3320] dark:text-[#b8d9a8]">{message}</p>}
      </section>

      <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-xl font-semibold">Chess.com Auto-Import</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
          Nur öffentliche Partien über die offizielle Chess.com PubAPI. Kein Login, kein Passwort, kein Scraping.
        </p>
        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Chess.com Username</span>
            <input
              value={chessComUsername}
              onChange={(event) => setChessComUsername(event.target.value)}
              placeholder="z. B. hikaru"
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none transition focus:border-[#5f8f45] dark:border-stone-700 dark:bg-stone-950"
              autoComplete="username"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Zeitformat</span>
              <select
                value={timeClass}
                onChange={(event) => setTimeClass(event.target.value as ChessComTimeClass)}
                className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-950"
              >
                <option value="all">Alle</option>
                <option value="rapid">Nur Rapid</option>
                <option value="blitz">Nur Blitz</option>
                <option value="bullet">Nur Bullet</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Zeitraum</span>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as ChessComPeriod)}
                className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-950"
              >
                <option value="last-month">Nur letzter Monat</option>
                <option value="last-year">Nur letztes Jahr</option>
                <option value="all">Alle Archive</option>
              </select>
            </label>
          </div>
          <ActionButton onClick={() => void handleChessComImport()} disabled={isImporting} icon={<CloudDownload size={17} />}>
            {isImporting ? "Import läuft..." : "Chess.com Partien importieren"}
          </ActionButton>
        </div>
        {(progress.message || isImporting) && (
          <div className="mt-4 rounded-md bg-stone-100 p-3 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-200">
            <p>{progress.message || "Import wird vorbereitet..."}</p>
            {progress.monthTotal && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-white dark:bg-stone-950">
                  <div className="h-2 rounded-full bg-[#5f8f45]" style={{ width: `${Math.round(((progress.monthIndex ?? 0) / progress.monthTotal) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  Archive gefunden: {progress.archivesFound ?? progress.monthTotal} · Importiert: {progress.importedCount ?? 0}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-md border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Importierte Partien</h2>
          <span className="text-sm text-stone-500">{visibleGames.length}/{games.length}</span>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={playerSearch}
            onChange={(event) => setPlayerSearch(event.target.value)}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-950"
            placeholder="Spieler suchen"
          />
          <button
            type="button"
            onClick={() => setSortOrder((value) => (value === "desc" ? "asc" : "desc"))}
            className="h-10 rounded-md border border-stone-300 px-3 text-sm hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            Datum {sortOrder === "desc" ? "absteigend" : "aufsteigend"}
          </button>
        </div>
        <div className="grid gap-3">
          {visibleGames.map((game) => (
            <article key={game.id} className="rounded-md border border-stone-200 p-4 transition hover:border-[#5f8f45] hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-950">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => void onToggleFavorite(game.id)}
                  className={`mt-1 grid h-9 w-9 place-items-center rounded-md ${game.favorite ? "bg-[#fff7df] text-[#b88700]" : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300"}`}
                  aria-label={game.favorite ? "Favorit entfernen" : "Als Favorit markieren"}
                  title={game.favorite ? "Favorit entfernen" : "Als Favorit markieren"}
                >
                  <Star size={18} fill={game.favorite ? "currentColor" : "none"} />
                </button>
                <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => onOpenGame(game.id)}>
                  <span className="mt-1 grid h-9 w-9 place-items-center rounded-md bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    <Shield size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {game.metadata.white} gegen {game.metadata.black}
                    </span>
                    <span className="mt-1 block text-sm text-stone-500">
                      {game.metadata.result} · {game.metadata.date || "ohne Datum"} · {game.metadata.timeControl || "ohne Zeitkontrolle"}
                    </span>
                    <span className="mt-1 block text-sm text-stone-500">{game.metadata.opening || "Eröffnung nicht im PGN"}</span>
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function getChessComErrorMessage(error: unknown): string {
  if (error instanceof ChessComImportError) return error.message;
  return "Chess.com Import fehlgeschlagen. Bitte prüfe Username, Verbindung und ggf. Rate-Limits.";
}
