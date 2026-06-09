import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Cpu, HelpCircle, Lightbulb, ListPlus, RotateCcw, Search } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { BoardControls } from "../components/BoardControls";
import { EmptyState } from "../components/EmptyState";
import { EvalGraph } from "../components/EvalGraph";
import { useResponsiveBoardWidth } from "../components/useResponsiveBoardWidth";
import { analyzeGame } from "../lib/analysis/analyzeGame";
import { buildSquareStyles, canSelectPiece, tryMove, uciToArrow } from "../lib/chess/boardUi";
import { stockfishService } from "../lib/stockfish/StockfishService";
import type { AnalysisDepth, AppSettings, StoredGame } from "../types";

export function ViewerPage({
  games,
  selectedGame,
  onSelectGame,
  onGamesChange,
  onUpload,
  settings
}: {
  games: StoredGame[];
  selectedGame: StoredGame | null;
  onSelectGame: (id: string) => void;
  onGamesChange: (games: StoredGame[]) => Promise<void>;
  onUpload: () => void;
  settings: AppSettings;
}) {
  const [activePly, setActivePly] = useState(0);
  const [depth, setDepth] = useState<AnalysisDepth>("normal");
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [variant, setVariant] = useState<{ fromPly: number; fen: string; moves: string[]; lastUci?: string } | null>(null);
  const [showWhy, setShowWhy] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState("");
  const board = useResponsiveBoardWidth();

  const maxPly = selectedGame?.moves.length ?? 0;
  const mainPosition = useMemo(() => buildPosition(selectedGame, activePly), [selectedGame, activePly]);
  const position = variant?.fen ?? mainPosition;
  const activeMove = selectedGame?.analysis.find((move) => move.ply === activePly) ?? null;
  const squareStyles = useMemo(
    () => buildSquareStyles({ fen: position, selectedSquare, showLegalMoves: settings.showLegalMoves }),
    [position, selectedSquare, settings.showLegalMoves]
  );
  const arrows = useMemo(() => {
    if (variant?.lastUci) return uciToArrow(variant.lastUci, "rgba(62, 130, 84, 0.72)");
    if (showSuggestion) return uciToArrow(activeMove?.bestMove, "rgba(212, 175, 55, 0.82)");
    return [];
  }, [activeMove?.bestMove, showSuggestion, variant?.lastUci]);

  useEffect(() => {
    setSelectedSquare(null);
    setVariant(null);
    setShowSuggestion(false);
    setTrainingMessage("");
  }, [selectedGame?.id, activePly]);

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

  function setPly(next: number) {
    setActivePly(Math.max(0, Math.min(maxPly, next)));
  }

  function handleDrop(sourceSquare: Square, targetSquare: Square) {
    const move = tryMove(position, sourceSquare, targetSquare);
    setSelectedSquare(null);
    if (!move) return false;
    setVariant({
      fromPly: activePly,
      fen: move.fen,
      moves: [...(variant?.moves ?? []), move.san],
      lastUci: move.uci
    });
    setShowSuggestion(false);
    return true;
  }

  function handleSquareClick(square: Square) {
    if (selectedSquare) {
      const move = tryMove(position, selectedSquare, square);
      if (move) {
        setVariant({
          fromPly: activePly,
          fen: move.fen,
          moves: [...(variant?.moves ?? []), move.san],
          lastUci: move.uci
        });
        setSelectedSquare(null);
        setShowSuggestion(false);
        return;
      }
    }

    setSelectedSquare(canSelectPiece(position, square, settings.allowOpponentMoves) ? square : null);
  }

  function saveTrainingMarker() {
    setTrainingMessage(activeMove ? "Diese Stellung ist als Trainingskandidat markiert." : "Wähle zuerst einen analysierten Zug.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="grid gap-4">
        <div className="rounded-md border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <select
            value={selectedGame.id}
            onChange={(event) => {
              onSelectGame(event.target.value);
              setPly(0);
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

        <div ref={board.ref} className="flex flex-col items-center overflow-hidden rounded-md border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <Chessboard
            id="franchess-viewer"
            position={position}
            boardWidth={board.width}
            onPieceDrop={handleDrop}
            onSquareClick={(square) => handleSquareClick(square as Square)}
            isDraggablePiece={({ sourceSquare }) => canSelectPiece(position, sourceSquare as Square, settings.allowOpponentMoves)}
            customSquareStyles={squareStyles}
            customArrows={arrows}
            areArrowsAllowed={false}
            autoPromoteToQueen
            customDarkSquareStyle={{ backgroundColor: "#769656" }}
            customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
          />
          <BoardControls current={activePly} max={maxPly} onChange={setPly} />
          {variant && (
            <div className="mt-3 w-full rounded-md bg-[#eef6ea] p-3 text-sm text-[#3f6b2e] dark:bg-[#1f3320] dark:text-[#b8d9a8]">
              Variante ab Zug {variant.fromPly + 1}: {variant.moves.join(" ")}
              <button type="button" className="ml-3 font-semibold underline" onClick={() => setVariant(null)}>
                Hauptvariante
              </button>
            </div>
          )}
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
        {selectedGame.analysis.length > 0 && <EvalGraph moves={selectedGame.analysis} activePly={activePly} onSelect={setPly} />}
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
            <ActionButton variant="quiet" onClick={() => setPly(0)} icon={<Search size={16} />}>
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
                  onClick={() => setPly(index + 1)}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Zugdetails</h2>
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="quiet" onClick={() => setShowWhy((value) => !value)} icon={<HelpCircle size={16} />}>
                Warum?
              </ActionButton>
              <ActionButton onClick={() => setShowSuggestion(true)} icon={<Lightbulb size={16} />}>
                Besseren Zug zeigen
              </ActionButton>
              <ActionButton variant="quiet" onClick={() => setVariant(null)} icon={<RotateCcw size={16} />}>
                Variante testen
              </ActionButton>
              <ActionButton variant="quiet" onClick={saveTrainingMarker} icon={<ListPlus size={16} />}>
                Als Training speichern
              </ActionButton>
            </div>
          </div>
          {activeMove ? (
            <div className="mt-4 grid gap-3 text-sm">
              <Row label="Gespielter Zug" value={activeMove.playedMove} />
              <Row label="Bester Zug" value={activeMove.bestMove ?? "nicht verfügbar"} />
              <Row label="Bewertung vorher/nachher" value={`${activeMove.evalBefore ?? "?"} / ${activeMove.evalAfter ?? "?"}`} />
              <Row label="Centipawn Loss" value={Math.round(activeMove.centipawnLoss)} />
              <Row label="Kategorie" value={activeMove.categories.join(", ") || "keine"} />
              {showSuggestion && (
                <p className="rounded-md bg-[#fff7df] p-3 text-stone-800 dark:bg-[#332b16] dark:text-[#f4dc93]">
                  Empfohlener Zug: {activeMove.bestMove ?? "nicht verfügbar"}. Die goldene Markierung zeigt die Engine-Idee.
                </p>
              )}
              {showWhy && (
                <p className="rounded-md bg-stone-100 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-200">{activeMove.explanation}</p>
              )}
              {trainingMessage && <p className="text-sm text-stone-500">{trainingMessage}</p>}
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
  const analyzedFen = game.analysis.find((move) => move.ply === ply)?.fenAfter;
  if (analyzedFen) return analyzedFen;
  for (const move of game.moves.slice(0, ply)) {
    try {
      chess.move(move);
    } catch {
      break;
    }
  }
  return chess.fen();
}
