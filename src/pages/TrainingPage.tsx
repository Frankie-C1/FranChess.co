import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { BookOpen, Brain, CheckCircle2, FileText, Puzzle, Target, Upload, XCircle } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
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

interface OpeningNode {
  id: string;
  san: string;
  uci: string;
  comment: string;
  nags: string[];
  fenBefore: string;
  fenAfter: string;
  children: OpeningNode[];
}

interface OpeningLine {
  id: string;
  name: string;
  variation?: string;
  importedAt: string;
  source?: string;
  root: OpeningNode[];
}

interface OpeningProgress {
  lineId: string;
  path: string[];
  updatedAt: string;
}

const puzzleThemes = ["fork", "pin", "mate", "hangingPiece", "endgame", "advantage", "crushing", "discoveredAttack", "opening"];
const openingStorageKey = "franchess.openingLines.v2";
const openingProgressKey = "franchess.openingProgress.v1";
const bundledOpeningsIndex = "/data/openings/index.json";

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
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing" | "empty" | "error">("loading");
  const [rating, setRating] = useState("all");
  const [theme, setTheme] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [game, setGame] = useState(() => new Chess());
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [message, setMessage] = useState("Waehle ein Puzzle.");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong" | "solved">("idle");
  const [showSolution, setShowSolution] = useState(false);
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
        const realPuzzles = data.filter((puzzle) => puzzle.fen && puzzle.moves?.length > 1);
        setPuzzles(realPuzzles);
        setLoadState(realPuzzles.length > 0 ? "ready" : "empty");
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

  useEffect(() => {
    setActiveIndex(0);
  }, [rating, theme]);

  function startPuzzle(puzzle: LichessPuzzle) {
    try {
      const next = new Chess(puzzle.fen);
      const firstMove = puzzle.moves[0];
      if (firstMove) {
        const opponentMove = next.move({ from: firstMove.slice(0, 2), to: firstMove.slice(2, 4), promotion: firstMove[4] || "q" });
        if (!opponentMove) throw new Error("invalid-start-move");
      }
      setGame(next);
      setSolutionIndex(1);
      setStatus("idle");
      setShowSolution(false);
      setMessage("Finde den naechsten Zug der Loesung.");
    } catch {
      setStatus("wrong");
      setMessage("Puzzle-FEN oder Startzug ist ungueltig.");
    }
  }

  function onPuzzleDrop(from: Square, to: Square) {
    if (!activePuzzle) return false;
    const expected = activePuzzle.moves[solutionIndex];
    const played = `${from}${to}`;
    const promotion = expected?.[4] ?? "q";
    if (!expected || !expected.startsWith(played)) {
      setStatus("wrong");
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
      setStatus("wrong");
      setMessage("Illegaler Zug.");
      return false;
    }

    const opponent = activePuzzle.moves[solutionIndex + 1];
    if (opponent) {
      try {
        next.move({ from: opponent.slice(0, 2), to: opponent.slice(2, 4), promotion: opponent[4] || "q" });
      } catch {
        setStatus("wrong");
        setMessage("Antwortzug im Puzzle-Datensatz ist ungueltig.");
      }
    }

    const nextIndex = solutionIndex + (opponent ? 2 : 1);
    setGame(next);
    setSolutionIndex(nextIndex);
    const solved = nextIndex >= activePuzzle.moves.length;
    setStatus(solved ? "solved" : "correct");
    setMessage(solved ? "Geloest." : "Richtig. Naechster Zug.");
    return true;
  }

  function revealSolution() {
    setShowSolution(true);
    setMessage(activePuzzle ? `Loesung: ${activePuzzle.moves.slice(1).join(" ")}` : "Keine Loesung geladen.");
  }

  if (loadState === "loading") return <Panel title="Puzzles laden" text="Suche nach public/data/puzzles.json ..." />;
  if (loadState === "missing" || loadState === "empty") return <PuzzleImportGuide />;
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Lichess Puzzle Training</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{message}</p>
            </div>
            <StatusBadge status={status} />
          </div>
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
            <ActionButton variant="quiet" onClick={revealSolution}>Loesung anzeigen</ActionButton>
            <ActionButton onClick={() => setActiveIndex((value) => (filtered.length ? (value + 1) % filtered.length : 0))}>Naechstes Puzzle</ActionButton>
          </div>
          {showSolution && activePuzzle && <p className="mt-3 rounded-md bg-[var(--color-surface-2)] p-3 text-sm">{activePuzzle.moves.slice(1).join(" ")}</p>}
          {activePuzzle && (
            <p className="mt-4 text-xs text-[var(--color-muted)]">
              {activePuzzle.puzzleId} - Rating {activePuzzle.rating} - {activePuzzle.themes.join(", ")}
            </p>
          )}
          {activePuzzle?.gameUrl && <a className="mt-2 block text-xs text-[var(--color-accent)] underline" href={activePuzzle.gameUrl} target="_blank" rel="noreferrer">Originalpartie bei Lichess</a>}
        </section>
      </div>
    </section>
  );
}

function OpeningTrainer() {
  const [lines, setLines] = useState<OpeningLine[]>([]);
  const [pgn, setPgn] = useState("");
  const [activeLine, setActiveLine] = useState<OpeningLine | null>(null);
  const [game, setGame] = useState(() => new Chess());
  const [path, setPath] = useState<string[]>([]);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [message, setMessage] = useState("Eroeffnungs-PGN importieren oder gespeicherte Linie waehlen.");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong" | "solved">("idle");
  const board = useResponsiveBoardWidth(420);

  const currentOptions = useMemo(() => findOpeningOptions(activeLine, path), [activeLine, path]);
  const targetNode = currentOptions.find((node) => node.id === targetNodeId) ?? currentOptions[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    async function loadLines() {
      const localLines = loadOpeningLines();
      let bundledLines: OpeningLine[] = [];
      try {
        const response = await fetch(bundledOpeningsIndex);
        if (response.ok) {
          const index = (await response.json()) as Array<{ id: string; path: string }>;
          const loaded = await Promise.all(
            index.map(async (entry) => {
              const pgnResponse = await fetch(entry.path);
              if (!pgnResponse.ok) return null;
              return parseOpeningPgn(await pgnResponse.text(), entry.path, entry.id);
            })
          );
          bundledLines = loaded.filter((line): line is OpeningLine => Boolean(line));
        }
      } catch {
        bundledLines = [];
      }
      if (cancelled) return;
      const merged = mergeOpeningLines(bundledLines, localLines);
      setLines(merged);
      if (merged[0]) startLine(merged[0], loadOpeningProgress(merged[0].id)?.path ?? []);
    }
    void loadLines();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!targetNodeId || !currentOptions.some((node) => node.id === targetNodeId)) {
      setTargetNodeId(currentOptions[0]?.id ?? null);
    }
  }, [currentOptions, targetNodeId]);

  function importOpening() {
    const parsed = parseOpeningPgn(pgn);
    if (!parsed) {
      setStatus("wrong");
      setMessage("PGN konnte nicht gelesen werden. Bitte PGN mit legalen Zuegen einfuegen.");
      return;
    }
    saveCustomLines([parsed, ...lines.filter((line) => line.id !== parsed.id)].slice(0, 24));
    startLine(parsed, []);
  }

  function importOpeningFile(file: File | null | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPgn(String(reader.result ?? ""));
      const parsed = parseOpeningPgn(String(reader.result ?? ""), file.name);
      if (!parsed) {
        setStatus("wrong");
        setMessage("PGN-Datei konnte nicht gelesen werden.");
        return;
      }
      saveCustomLines([parsed, ...lines.filter((line) => line.id !== parsed.id)].slice(0, 24));
      startLine(parsed, []);
    };
    reader.readAsText(file);
  }

  function saveCustomLines(next: OpeningLine[]) {
    setLines(next);
    window.localStorage.setItem(openingStorageKey, JSON.stringify(next.filter((line) => !isBundledOpening(line))));
  }

  function startLine(line: OpeningLine, resumePath: string[] = []) {
    const resumed = positionFromPath(line, resumePath);
    setActiveLine(line);
    setGame(resumed.chess);
    setPath(resumed.path);
    setTargetNodeId(null);
    setStatus("idle");
    const options = findOpeningOptions(line, resumed.path);
    setMessage(options[0]?.comment || (resumed.path.length ? "Fortschritt geladen. Finde den naechsten Zug." : "Finde den naechsten Zug der Linie."));
  }

  function resetLine() {
    if (!activeLine) return;
    saveOpeningProgress(activeLine.id, []);
    startLine(activeLine, []);
  }

  function onOpeningDrop(from: Square, to: Square) {
    if (!activeLine || !targetNode) return false;
    const next = new Chess(game.fen());
    let move = null;
    try {
      move = next.move({ from, to, promotion: "q" });
    } catch {
      move = null;
    }
    if (!move || move.san !== targetNode.san) {
      setStatus("wrong");
      setMessage("Falscher Zug. Die Figur springt zurueck.");
      return false;
    }
    const nextPath = [...path, targetNode.id];
    setGame(next);
    setPath(nextPath);
    saveOpeningProgress(activeLine.id, nextPath);
    const nextOptions = targetNode.children;
    setTargetNodeId(nextOptions[0]?.id ?? null);
    const solved = nextOptions.length === 0;
    setStatus(solved ? "solved" : "correct");
    setMessage(targetNode.comment || (solved ? "Linie abgeschlossen." : "Richtig. Weiter."));
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
            PGN-Text oder PGN-Datei importieren. Hauptvariante, Nebenvarianten und Kommentare werden als Variantenbaum gespeichert.
          </p>
          <textarea
            value={pgn}
            onChange={(event) => setPgn(event.target.value)}
            className="mt-4 min-h-32 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
            placeholder={'[Event "Italienisch"]\n1. e4 e5 2. Nf3 Nc6 (2... d6 {Philidor-Aufbau}) 3. Bc4 {Zielt auf f7.}'}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton onClick={importOpening} icon={<FileText size={17} />}>PGN importieren</ActionButton>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-surface-2)]">
              <Upload size={17} />
              PGN-Datei
              <input type="file" accept=".pgn,.txt" className="hidden" onChange={(event) => importOpeningFile(event.target.files?.[0])} />
            </label>
          </div>
        </section>

        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Eroeffnungstraining</h2>
              <p className="mt-2 rounded-md bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]">{message}</p>
            </div>
            <StatusBadge status={status} />
          </div>
          {activeLine ? (
            <>
              <p className="mt-3 text-sm">
                {activeLine.name}{activeLine.variation ? ` - ${activeLine.variation}` : ""} - Fortschritt {path.length}/{countMainDepth(activeLine.root)}
              </p>
              {targetNode && (
                <p className="mt-2 text-sm">
                  Naechster Zielzug: <span className="font-semibold">{targetNode.san}</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton variant="quiet" onClick={resetLine}>Neu starten</ActionButton>
              </div>
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold">Variantenbaum</h3>
                <OpeningTree nodes={activeLine.root} currentOptions={currentOptions} targetNodeId={targetNode?.id ?? null} onSelectTarget={setTargetNodeId} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-muted)]">Noch keine Eroeffnung importiert. Nutze PGN-Text oder PGN-Datei oben.</p>
          )}
          {lines.length > 0 && (
            <div className="mt-4 grid gap-2">
              <h3 className="text-sm font-semibold">Gespeicherte Eroeffnungen</h3>
              {lines.map((line) => (
                <button key={line.id} type="button" onClick={() => startLine(line, loadOpeningProgress(line.id)?.path ?? [])} className="rounded-md border border-[var(--color-border)] p-3 text-left text-sm hover:bg-[var(--color-surface-2)]">
                  {line.name}{line.variation ? ` - ${line.variation}` : ""} - {countNodes(line.root)} Zuege
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function OpeningTree({
  nodes,
  currentOptions,
  targetNodeId,
  onSelectTarget,
  depth = 0
}: {
  nodes: OpeningNode[];
  currentOptions: OpeningNode[];
  targetNodeId: string | null;
  onSelectTarget: (id: string) => void;
  depth?: number;
}) {
  if (nodes.length === 0) return <p className="text-sm text-[var(--color-muted)]">Keine weiteren Zuege.</p>;
  return (
    <div className="grid gap-2">
      {nodes.map((node) => {
        const selectable = currentOptions.some((option) => option.id === node.id);
        return (
          <div key={node.id} className="grid gap-2" style={{ marginLeft: depth * 14 }}>
            <button
              type="button"
              disabled={!selectable}
              onClick={() => onSelectTarget(node.id)}
              className={`rounded-md border p-2 text-left text-sm ${
                targetNodeId === node.id
                  ? "border-[var(--color-accent)] bg-[var(--color-surface-2)]"
                  : selectable
                    ? "border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
                    : "border-[var(--color-border)] opacity-70"
              }`}
            >
              <span className="font-semibold">{node.san}</span>
              {node.nags?.length > 0 && <span className="ml-1 text-[var(--color-accent)]">{node.nags.join(" ")}</span>}
              {node.comment && <span className="ml-2 text-[var(--color-muted)]">{node.comment}</span>}
            </button>
            {node.children.length > 0 && <OpeningTree nodes={node.children} currentOptions={currentOptions} targetNodeId={targetNodeId} onSelectTarget={onSelectTarget} depth={depth + 1} />}
          </div>
        );
      })}
    </div>
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

function StatusBadge({ status }: { status: "idle" | "correct" | "wrong" | "solved" }) {
  if (status === "correct") return <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs text-green-800"><CheckCircle2 size={14} />Richtig</span>;
  if (status === "wrong") return <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs text-red-800"><XCircle size={14} />Falsch</span>;
  if (status === "solved") return <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-accent)]"><CheckCircle2 size={14} />Geloest</span>;
  return <span className="rounded-md bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-muted)]">Bereit</span>;
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
        <h2 className="text-lg font-semibold">Puzzle-Daten importieren</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
        Es werden keine Puzzle-Platzhalter angezeigt. Lade die offizielle Lichess Puzzle Database CSV von https://database.lichess.org/#puzzles herunter. Lichess veroeffentlicht diese Daten unter Creative Commons CC0.
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

function saveOpeningProgress(lineId: string, path: string[]) {
  const all = loadAllOpeningProgress().filter((entry) => entry.lineId !== lineId);
  all.push({ lineId, path, updatedAt: new Date().toISOString() });
  window.localStorage.setItem(openingProgressKey, JSON.stringify(all));
}

function loadOpeningProgress(lineId: string): OpeningProgress | null {
  return loadAllOpeningProgress().find((entry) => entry.lineId === lineId) ?? null;
}

function loadAllOpeningProgress(): OpeningProgress[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(openingProgressKey) ?? "[]") as OpeningProgress[];
  } catch {
    return [];
  }
}

function parseOpeningPgn(pgn: string, source?: string, forcedId?: string): OpeningLine | null {
  const name = pgn.match(/\[Opening\s+"([^"]+)"/)?.[1] || pgn.match(/\[Event\s+"([^"]+)"/)?.[1] || "Importierte Linie";
  const variation = pgn.match(/\[Variation\s+"([^"]+)"/)?.[1] || undefined;
  const body = pgn.replace(/\[[^\]]+\]/g, " ");
  const tokens = tokenizePgn(body);
  const root: OpeningNode[] = [];
  const mainFrame = makeFrame(root, new Chess());
  const stack: ReturnType<typeof makeFrame>[] = [];

  for (const token of tokens) {
    const frame = stack[stack.length - 1] ?? mainFrame;
    if (token === "(") {
      if (frame.lastParent && frame.lastFenBefore) {
        stack.push(makeFrame(frame.lastParent, new Chess(frame.lastFenBefore)));
      }
      continue;
    }
    if (token === ")") {
      stack.pop();
      continue;
    }
    if (token.startsWith("{")) {
      const comment = token.slice(1, -1).trim();
      if (frame.lastNode) frame.lastNode.comment = joinComment(frame.lastNode.comment, comment);
      else frame.pendingComment = joinComment(frame.pendingComment, comment);
      continue;
    }
    if (/^\$\d+$/.test(token)) {
      if (frame.lastNode) frame.lastNode.nags = [...(frame.lastNode.nags ?? []), token];
      continue;
    }
    if (isPgnNoise(token)) continue;

    const nags = extractNags(token);
    const san = token.replace(/[!?+#]+$/g, (suffix) => suffix.replace(/[!?]/g, "").replace(/[+#]/g, ""));
    const fenBefore = frame.chess.fen();
    let move = null;
    try {
      move = frame.chess.move(san);
    } catch {
      move = null;
    }
    if (!move) continue;

    const node: OpeningNode = {
      id: `${move.from}${move.to}${move.promotion ?? ""}-${frame.nodes.length}-${fenBefore.split(" ")[0].slice(0, 8)}`,
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ""}`,
      comment: frame.pendingComment,
      nags,
      fenBefore,
      fenAfter: frame.chess.fen(),
      children: []
    };
    frame.pendingComment = "";
    frame.nodes.push(node);
    frame.lastParent = frame.nodes;
    frame.lastFenBefore = fenBefore;
    frame.lastNode = node;
    frame.nodes = node.children;
  }

  return root.length > 0 ? { id: forcedId ?? stableOpeningId(name, root), name, variation, importedAt: new Date().toISOString(), source, root } : null;
}

function makeFrame(nodes: OpeningNode[], chess: Chess) {
  return {
    nodes,
    chess,
    pendingComment: "",
    lastParent: null as OpeningNode[] | null,
    lastFenBefore: "",
    lastNode: null as OpeningNode | null
  };
}

function tokenizePgn(body: string): string[] {
  const tokens: string[] = [];
  const pattern = /\{[^}]*\}|\(|\)|[^\s(){}]+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) tokens.push(match[0]);
  return tokens;
}

function isPgnNoise(token: string): boolean {
  return /^\d+\.(\.\.)?$/.test(token) || /^\$\d+$/.test(token) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token);
}

function extractNags(token: string): string[] {
  const suffix = token.match(/([!?]+)(?:[+#]+)?$/)?.[1];
  return suffix ? [suffix] : [];
}

function joinComment(existing: string, next: string): string {
  if (!existing) return next;
  if (!next) return existing;
  return `${existing} ${next}`;
}

function stableOpeningId(name: string, root: OpeningNode[]): string {
  return `${name}-${root.map((node) => node.uci).join("-")}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 96);
}

function mergeOpeningLines(bundled: OpeningLine[], local: OpeningLine[]): OpeningLine[] {
  const seen = new Set<string>();
  const merged: OpeningLine[] = [];
  for (const line of [...bundled, ...local]) {
    if (seen.has(line.id)) continue;
    seen.add(line.id);
    merged.push(line);
  }
  return merged;
}

function isBundledOpening(line: OpeningLine): boolean {
  return Boolean(line.source?.startsWith("/data/openings/"));
}

function findOpeningOptions(line: OpeningLine | null, path: string[]): OpeningNode[] {
  if (!line) return [];
  let options = line.root;
  for (const id of path) {
    const next = options.find((node) => node.id === id);
    if (!next) return options;
    options = next.children;
  }
  return options;
}

function positionFromPath(line: OpeningLine, savedPath: string[]): { chess: Chess; path: string[] } {
  const chess = new Chess();
  const applied: string[] = [];
  let options = line.root;
  for (const id of savedPath) {
    const node = options.find((entry) => entry.id === id);
    if (!node) break;
    const move = chess.move({ from: node.uci.slice(0, 2), to: node.uci.slice(2, 4), promotion: node.uci[4] || "q" });
    if (!move) break;
    applied.push(node.id);
    options = node.children;
  }
  return { chess, path: applied };
}

function countNodes(nodes: OpeningNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function countMainDepth(nodes: OpeningNode[]): number {
  let count = 0;
  let current = nodes[0] ?? null;
  while (current) {
    count += 1;
    current = current.children[0] ?? null;
  }
  return count;
}
