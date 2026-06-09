import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { BookOpen, Brain, CheckCircle2, FileText, Puzzle, Target, Upload, XCircle } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { EmptyState } from "../components/EmptyState";
import { useResponsiveBoardWidth } from "../components/useResponsiveBoardWidth";
import type { StoredGame, TrainingTask } from "../types";

type TrainingArea = "training" | "puzzles" | "openings";

interface LichessPuzzle {
  puzzleId: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  gameUrl?: string;
  openingTags?: string[];
}

interface OpeningLine {
  name: string;
  moves: string[];
  comments: string[];
}

const puzzleThemes = ["fork", "pin", "mate", "hangingPiece", "endgame", "advantage", "crushing", "discoveredAttack", "opening"];
const openingStorageKey = "franchess.openingLines.v1";

export function TrainingPage({
  games,
  onUpload,
  onSelectGame
}: {
  games: StoredGame[];
  onUpload: () => void;
  onSelectGame: (id: string, ply: number) => void;
}) {
  const [area, setArea] = useState<TrainingArea>("training");
  const tasks = useMemo(() => buildTasks(games), [games]);

  if (games.length === 0) {
    return <EmptyState onUpload={onUpload} />;
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-muted)]">Training</p>
            <h1 className="mt-1 text-2xl font-semibold">Ueben aus echten Stellungen</h1>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <AreaButton icon={<Target size={17} />} active={area === "training"} label="Training" onClick={() => setArea("training")} />
            <AreaButton icon={<Puzzle size={17} />} active={area === "puzzles"} label="Puzzles" onClick={() => setArea("puzzles")} />
            <AreaButton icon={<BookOpen size={17} />} active={area === "openings"} label="Eroeffnungen" onClick={() => setArea("openings")} />
          </div>
        </div>
      </section>

      {area === "training" && <TrainingTasks tasks={tasks} onUpload={onUpload} onSelectGame={onSelectGame} />}
      {area === "puzzles" && <PuzzleTrainer />}
      {area === "openings" && <OpeningTrainer />}
    </div>
  );
}

function TrainingTasks({
  tasks,
  onUpload,
  onSelectGame
}: {
  tasks: TrainingTask[];
  onUpload: () => void;
  onSelectGame: (id: string, ply: number) => void;
}) {
  if (tasks.length === 0) {
    return (
      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Brain className="text-[var(--color-accent)]" size={22} />
          <h2 className="text-lg font-semibold">Noch keine Aufgaben aus eigenen Fehlern</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Analysiere importierte Partien im Viewer. Danach erzeugt FranChess aus kritischen Stellungen echte Trainingsaufgaben.
        </p>
        <ActionButton className="mt-4" onClick={onUpload} icon={<Upload size={17} />}>Partien importieren</ActionButton>
      </section>
    );
  }

  return (
    <section className="grid gap-3 md:grid-cols-2">
      {tasks.map((task) => (
        <article key={task.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-muted)]">Zug {task.moveNumber}</p>
              <h2 className="mt-1 font-semibold">{humanCategory(task.category)}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{task.prompt}</p>
              {task.bestMove && <p className="mt-2 text-sm">Besserer Zug: <span className="font-semibold">{task.bestMove}</span></p>}
            </div>
            <Target className="shrink-0 text-[var(--color-accent)]" size={22} />
          </div>
          <ActionButton className="mt-4 w-full" variant="quiet" onClick={() => onSelectGame(task.gameId, task.ply)}>
            Stellung im Viewer oeffnen
          </ActionButton>
        </article>
      ))}
    </section>
  );
}

function PuzzleTrainer() {
  const [puzzles, setPuzzles] = useState<LichessPuzzle[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [rating, setRating] = useState("all");
  const [theme, setTheme] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [game, setGame] = useState(() => new Chess());
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [message, setMessage] = useState("Waehle ein Puzzle.");
  const board = useResponsiveBoardWidth(420);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/puzzles.json")
      .then((response) => {
        if (!response.ok) throw new Error(response.status === 404 ? "missing" : "error");
        return response.json() as Promise<LichessPuzzle[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setPuzzles(data.filter((puzzle) => puzzle.fen && puzzle.moves?.length > 1));
        setLoadState("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadState(error instanceof Error && error.message === "missing" ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return puzzles.filter((puzzle) => {
      const ratingOk = rating === "all" || (rating === "low" ? puzzle.rating <= 1400 : rating === "mid" ? puzzle.rating > 1400 && puzzle.rating <= 2000 : puzzle.rating > 2000);
      const themeOk = theme === "all" || puzzle.themes.includes(theme);
      return ratingOk && themeOk;
    });
  }, [puzzles, rating, theme]);

  const activePuzzle = filtered[activeIndex] ?? filtered[0] ?? null;

  useEffect(() => {
    if (!activePuzzle) return;
    startPuzzle(activePuzzle);
  }, [activePuzzle?.puzzleId]);

  function startPuzzle(puzzle: LichessPuzzle) {
    const next = new Chess(puzzle.fen);
    const firstMove = puzzle.moves[0];
    if (firstMove) {
      try {
        next.move({ from: firstMove.slice(0, 2), to: firstMove.slice(2, 4), promotion: firstMove[4] || "q" });
      } catch {
        setMessage("Puzzle-FEN oder Startzug ist ungueltig.");
      }
    }
    setGame(next);
    setSolutionIndex(1);
    setMessage("Finde den naechsten Zug der Loesung.");
  }

  function onPuzzleDrop(from: Square, to: Square) {
    if (!activePuzzle) return false;
    const expected = activePuzzle.moves[solutionIndex];
    const played = `${from}${to}`;
    const promotion = expected?.[4] ?? "q";
    if (!expected || !expected.startsWith(played)) {
      setMessage("Nicht korrekt. Die Figur springt zurueck.");
      return false;
    }

    const next = new Chess(game.fen());
    let userMove = null;
    try {
      userMove = next.move({ from, to, promotion });
    } catch {
      userMove = null;
    }
    if (!userMove) {
      setMessage("Illegaler Zug.");
      return false;
    }

    const opponent = activePuzzle.moves[solutionIndex + 1];
    if (opponent) {
      try {
        next.move({ from: opponent.slice(0, 2), to: opponent.slice(2, 4), promotion: opponent[4] || "q" });
      } catch {
        setMessage("Antwortzug im Puzzle-Datensatz ist ungueltig.");
      }
    }

    const nextIndex = solutionIndex + (opponent ? 2 : 1);
    setGame(next);
    setSolutionIndex(nextIndex);
    setMessage(nextIndex >= activePuzzle.moves.length ? "Geloest." : "Richtig. Naechster Zug.");
    return true;
  }

  if (loadState === "loading") return <Panel title="Puzzles laden" text="Suche nach public/data/puzzles.json ..." />;
  if (loadState === "missing") return <PuzzleImportGuide />;
  if (loadState === "error") return <Panel title="Puzzle-Daten konnten nicht geladen werden" text="Pruefe public/data/puzzles.json oder importiere die CSV erneut." />;

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(320px,460px)_1fr]">
      <div ref={board.ref} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm">
        <Chessboard
          id="franchess-puzzle"
          position={game.fen()}
          boardWidth={board.width}
          onPieceDrop={(from, to) => onPuzzleDrop(from as Square, to as Square)}
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
          animationDuration={160}
          autoPromoteToQueen
        />
      </div>
      <div className="grid content-start gap-4">
        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Lichess Puzzle Training</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{message}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Rating
              <select className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3" value={rating} onChange={(event) => setRating(event.target.value)}>
                <option value="all">Alle</option>
                <option value="low">bis 1400</option>
                <option value="mid">1401-2000</option>
                <option value="high">ueber 2000</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Thema
              <select className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3" value={theme} onChange={(event) => setTheme(event.target.value)}>
                <option value="all">Alle</option>
                {puzzleThemes.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton variant="quiet" onClick={() => activePuzzle && startPuzzle(activePuzzle)}>Neu starten</ActionButton>
            <ActionButton onClick={() => setActiveIndex((value) => (filtered.length ? (value + 1) % filtered.length : 0))}>Naechstes Puzzle</ActionButton>
          </div>
          {activePuzzle && (
            <p className="mt-4 text-xs text-[var(--color-muted)]">
              {activePuzzle.puzzleId} - Rating {activePuzzle.rating} - {activePuzzle.themes.join(", ")}
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

function OpeningTrainer() {
  const [lines, setLines] = useState<OpeningLine[]>(() => loadOpeningLines());
  const [pgn, setPgn] = useState("");
  const [activeLine, setActiveLine] = useState<OpeningLine | null>(() => loadOpeningLines()[0] ?? null);
  const [game, setGame] = useState(() => new Chess());
  const [moveIndex, setMoveIndex] = useState(0);
  const [message, setMessage] = useState("Importiere ein Eroeffnungs-PGN oder waehle eine gespeicherte Linie.");
  const board = useResponsiveBoardWidth(420);

  function importOpening() {
    const parsed = parseOpeningPgn(pgn);
    if (!parsed) {
      setMessage("PGN konnte nicht als Hauptvariante gelesen werden.");
      return;
    }
    const next = [parsed, ...lines.filter((line) => line.name !== parsed.name)].slice(0, 20);
    setLines(next);
    window.localStorage.setItem(openingStorageKey, JSON.stringify(next));
    startLine(parsed);
  }

  function startLine(line: OpeningLine) {
    setActiveLine(line);
    setGame(new Chess());
    setMoveIndex(0);
    setMessage(line.comments[0] || "Finde den naechsten Zug der Linie.");
  }

  function onOpeningDrop(from: Square, to: Square) {
    if (!activeLine) return false;
    const expectedSan = activeLine.moves[moveIndex];
    const next = new Chess(game.fen());
    let move = null;
    try {
      move = next.move({ from, to, promotion: "q" });
    } catch {
      move = null;
    }
    if (!move || move.san !== expectedSan) {
      setMessage("Das ist nicht der gespeicherte Eroeffnungszug. Die Figur springt zurueck.");
      return false;
    }
    const nextIndex = moveIndex + 1;
    setGame(next);
    setMoveIndex(nextIndex);
    setMessage(activeLine.comments[nextIndex] || (nextIndex >= activeLine.moves.length ? "Linie abgeschlossen." : "Richtig. Weiter."));
    return true;
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(320px,460px)_1fr]">
      <div ref={board.ref} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm">
        <Chessboard
          id="franchess-openings"
          position={game.fen()}
          boardWidth={board.width}
          onPieceDrop={(from, to) => onOpeningDrop(from as Square, to as Square)}
          customDarkSquareStyle={{ backgroundColor: "#b4875d" }}
          customLightSquareStyle={{ backgroundColor: "#ead7b7" }}
          animationDuration={160}
          autoPromoteToQueen
        />
      </div>
      <div className="grid content-start gap-4">
        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Eroeffnungs-PGN importieren</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Importiert wird die Hauptvariante. Kommentare in geschweiften Klammern werden als Hinweise angezeigt.
          </p>
          <textarea
            value={pgn}
            onChange={(event) => setPgn(event.target.value)}
            className="mt-4 min-h-36 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
            placeholder={'[Event "Italienisch"]\n1. e4 e5 2. Nf3 Nc6 3. Bc4 {Zielt auf f7.}'}
          />
          <ActionButton className="mt-3" onClick={importOpening} icon={<FileText size={17} />}>PGN importieren</ActionButton>
        </section>

        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Aktuelle Linie</h2>
          <p className="mt-2 rounded-md bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]">{message}</p>
          {activeLine && <p className="mt-3 text-sm">Zug {moveIndex + 1} von {activeLine.moves.length}: <span className="font-semibold">{activeLine.moves[moveIndex] ?? "fertig"}</span></p>}
          <div className="mt-4 grid gap-2">
            {lines.map((line) => (
              <button key={line.name} type="button" onClick={() => startLine(line)} className="rounded-md border border-[var(--color-border)] p-3 text-left text-sm hover:bg-[var(--color-surface-2)]">
                {line.name} - {line.moves.length} Zuege
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function AreaButton({ icon, active, label, onClick }: { icon: ReactNode; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm ${
        active ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]" : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Panel({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p>
    </section>
  );
}

function PuzzleImportGuide() {
  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Puzzle className="text-[var(--color-accent)]" size={22} />
        <h2 className="text-lg font-semibold">Keine Puzzle-Daten importiert</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
        Puzzles werden nicht simuliert. Lade die offizielle Lichess Puzzle Database CSV lokal herunter und erzeuge daraus einen kleinen Frontend-Datensatz:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md bg-[var(--color-surface-2)] p-3 text-xs">node scripts/import-lichess-puzzles.mjs path/to/lichess_db_puzzle.csv public/data/puzzles.json 1000</pre>
    </section>
  );
}

function buildTasks(games: StoredGame[]): TrainingTask[] {
  return games
    .flatMap((game) =>
      game.analysis
        .filter((move) => move.categories.length > 0)
        .map((move) => ({
          id: move.id,
          gameId: game.id,
          fen: move.fenBefore,
          moveNumber: move.moveNumber,
          ply: move.ply,
          category: move.categories[0],
          prompt: move.explanation,
          bestMove: move.bestMove
        }))
    )
    .slice(0, 12);
}

function humanCategory(category: string): string {
  const labels: Record<string, string> = {
    blunder: "Grober Patzer",
    mistake: "Fehler",
    inaccuracy: "Ungenauigkeit",
    hanging_piece: "Haengende Figur",
    undefended_piece: "Ungedeckte Figur",
    king_safety: "Koenigssicherheit",
    tactical_blunder: "Taktischer Patzer",
    missed_mate: "Verpasstes Matt"
  };
  return labels[category] ?? category.replace(/_/g, " ");
}

function loadOpeningLines(): OpeningLine[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(openingStorageKey) ?? "[]") as OpeningLine[];
  } catch {
    return [];
  }
}

function parseOpeningPgn(pgn: string): OpeningLine | null {
  const name = pgn.match(/\[Event\s+"([^"]+)"/)?.[1] || pgn.match(/\[Opening\s+"([^"]+)"/)?.[1] || "Importierte Linie";
  const comments = Array.from(pgn.matchAll(/\{([^}]+)\}/g), (match) => match[1].trim());
  const cleaned = pgn
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ");
  const moves = cleaned.split(/\s+/).map((entry) => entry.trim()).filter(Boolean);
  if (moves.length === 0) return null;

  const chess = new Chess();
  const legalSans: string[] = [];
  for (const san of moves) {
    let move = null;
    try {
      move = chess.move(san);
    } catch {
      move = null;
    }
    if (!move) break;
    legalSans.push(move.san);
  }
  return legalSans.length > 0 ? { name, moves: legalSans, comments } : null;
}
