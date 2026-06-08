import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Cpu, Search } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { EmptyState } from "../components/EmptyState";
import { EvalGraph } from "../components/EvalGraph";
import { useResponsiveBoardWidth } from "../components/useResponsiveBoardWidth";
import { analyzeGame } from "../lib/analysis/analyzeGame";
import { stockfishService } from "../lib/stockfish/StockfishService";
import type { AnalysisDepth, StoredGame } from "../types";

export function ViewerPage({
  games,
  selectedGame,
  onSelectGame,
  onGamesChange,
  onUpload
}: {
  games: StoredGame[];
  selectedGame: StoredGame | null;
  onSelectGame: (id: string) => void;
  onGamesChange: (games: StoredGame[]) => Promise<void>;
  onUpload: () => void;
}) {
  const [activePly, setActivePly] = useState(0);
  const [depth, setDepth] = useState<AnalysisDepth>("normal");
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const board = useResponsiveBoardWidth();

  const position = useMemo(() => buildPosition(selectedGame, activePly), [selectedGame, activePly]);
  const activeMove = selectedGame?.analysis.find((move) => move.ply === activePly) ?? null;

  if (!selectedGame) return <EmptyState onUpload={onUpload} />;

  async function runAnalysis() {
    if (!selectedGame) return;
    setIsAnalyzing(true);
    setProgress(0);
    const analyzed = await analyzeGame(selectedGame, depth, setProgress);
    await onGamesChange(games.map((game) => (game.id === analyzed.id ? analyzed : game)));
    setProgress(1);
    setIsAnalyzing(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="grid gap-4">
        <div className="rounded-md border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <select
            value={selectedGame.id}
            onChange={(event) => {
              onSelectGame(event.target.value);
              setActivePly(0);
            }}
            className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-950"
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.metadata.white} - {game.metadata.black} ({game.metadata.result})
              </option>
            ))}
          </select>
        </div>
        <div ref={board.ref} className="overflow-hidden rounded-md border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <Chessboard
            id="franchess-viewer"
            position={position}
            boardWidth={board.width}
            customDarkSquareStyle={{ backgroundColor: "#769656" }}
            customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
          />
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="grid grid-cols-3 gap-2">
            {(["quick", "normal", "deep"] as AnalysisDepth[]).map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setDepth(value)}
                className={`h-10 rounded-md text-sm ${
                  depth === value
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                    : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                }`}
              >
                {value === "quick" ? "Schnell" : value === "normal" ? "Normal" : "Tief"}
              </button>
            ))}
          </div>
          <ActionButton className="mt-3 w-full" onClick={() => void runAnalysis()} disabled={isAnalyzing} icon={<Cpu size={17} />}>
            {isAnalyzing ? "Analysiere..." : "Partie analysieren"}
          </ActionButton>
          {isAnalyzing && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800">
                <div className="h-2 rounded-full bg-[#5f8f45]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="mt-2 text-sm text-stone-500">{Math.round(progress * 100)}% abgeschlossen</p>
            </div>
          )}
          <p className="mt-3 text-xs text-stone-500">Engine: {stockfishService.status.label}</p>
          <p className="mt-1 text-xs text-stone-500">
            WASM: {stockfishService.status.wasmActive ? "aktiv" : "nicht aktiv"} · {stockfishService.status.workerUrl}
          </p>
        </div>
      </section>

      <section className="grid gap-4">
        {selectedGame.analysis.length > 0 && <EvalGraph moves={selectedGame.analysis} activePly={activePly} onSelect={setActivePly} />}
        <div className="rounded-md border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">
                {selectedGame.metadata.white} gegen {selectedGame.metadata.black}
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                {selectedGame.metadata.date || "ohne Datum"} · {selectedGame.metadata.opening || "Eröffnung nicht im PGN"}
              </p>
            </div>
            <ActionButton variant="quiet" onClick={() => setActivePly(0)} icon={<Search size={16} />}>
              Start
            </ActionButton>
          </div>

          <div className="mt-5 grid max-h-[340px] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-4">
            {selectedGame.moves.map((move, index) => {
              const analysis = selectedGame.analysis[index];
              const serious = (analysis?.centipawnLoss ?? 0) > 150;
              return (
                <button
                  type="button"
                  key={`${move}-${index}`}
                  onClick={() => setActivePly(index + 1)}
                  className={`move-pill h-10 rounded-md px-3 text-left text-sm ${
                    activePly === index + 1
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                      : serious
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                        : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                  }`}
                >
                  {Math.floor(index / 2) + 1}.{index % 2 === 1 ? ".." : ""} {move}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold">Zugdetails</h2>
          {activeMove ? (
            <div className="mt-4 grid gap-3 text-sm">
              <Row label="Gespielter Zug" value={activeMove.playedMove} />
              <Row label="Bester Zug" value={activeMove.bestMove ?? "nicht verfügbar"} />
              <Row label="Bewertung vorher/nachher" value={`${activeMove.evalBefore ?? "?"} / ${activeMove.evalAfter ?? "?"}`} />
              <Row label="Centipawn Loss" value={Math.round(activeMove.centipawnLoss)} />
              <Row label="Kategorie" value={activeMove.categories.join(", ") || "keine"} />
              <p className="rounded-md bg-stone-100 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-200">{activeMove.explanation}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500">Wähle einen Zug aus oder starte eine Analyse.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-2 dark:border-stone-800">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function buildPosition(game: StoredGame | null, ply: number): string {
  const chess = new Chess();
  if (!game || ply === 0) return chess.fen();
  for (const move of game.moves.slice(0, ply)) {
    chess.move(move);
  }
  return chess.fen();
}
