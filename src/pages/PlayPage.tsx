import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Lightbulb, RotateCcw } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { useResponsiveBoardWidth } from "../components/useResponsiveBoardWidth";
import { stockfishService } from "../lib/stockfish/StockfishService";
import type { CoachDifficulty } from "../types";

export function PlayPage() {
  const [game, setGame] = useState(() => new Chess());
  const [difficulty, setDifficulty] = useState<CoachDifficulty>("intermediate");
  const [coachNote, setCoachNote] = useState("Spiele mit Weiß. Der Coach meldet sich nach groben Fehlern.");
  const [isThinking, setIsThinking] = useState(false);
  const [engineStatus, setEngineStatus] = useState(() => stockfishService.status);
  const board = useResponsiveBoardWidth();
  const position = useMemo(() => game.fen(), [game]);

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (isThinking || game.isGameOver()) return false;
    const beforeFen = game.fen();
    const next = new Chess(game.fen());
    const move = next.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    if (!move) return false;

    setGame(next);
    void reviewAndReply(beforeFen, next, move.san);
    return true;
  }

  async function reviewAndReply(beforeFen: string, next: Chess, san: string) {
    const before = await stockfishService.evaluateFen(beforeFen, "quick");
    const after = await stockfishService.evaluateFen(next.fen(), "quick");
    setEngineStatus(stockfishService.status);
    const loss = Math.max(0, (before.cp ?? 0) - (after.cp ?? 0));

    if (loss > 220) {
      setCoachNote(
        `Stopp: ${san} verliert etwa ${Math.round(loss)} Centipawns. Die übersehene Drohung liegt in der Aktivität des Gegners; prüfe Kandidatenzüge wie ${before.bestMove ?? "den Engine-Vorschlag"}.`
      );
      return;
    }

    await playCoachMove(next);
  }

  async function playCoachMove(current: Chess) {
    if (current.isGameOver()) {
      setCoachNote("Partie beendet.");
      return;
    }
    setIsThinking(true);
    const moveUci = await stockfishService.chooseMove(current.fen(), difficulty);
    setEngineStatus(stockfishService.status);
    const reply = new Chess(current.fen());
    if (moveUci) {
      reply.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci[4] || "q" });
    }
    setGame(reply);
    setCoachNote(moveUci ? `Coach spielte ${moveUci}.` : "Coach findet keinen legalen Zug.");
    setIsThinking(false);
  }

  function reset() {
    setGame(new Chess());
    setCoachNote("Neue Partie. Spiele mit Weiß.");
  }

  async function searchBetterMove() {
    const suggestion = await stockfishService.evaluateFen(game.fen(), "normal");
    setEngineStatus(stockfishService.status);
    setCoachNote(`Besserer Kandidat: ${suggestion.bestMove ?? "nicht verfügbar"}. Prüfe zuerst Drohungen gegen König und ungedeckte Figuren.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <section ref={board.ref} className="overflow-hidden rounded-md border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
        <Chessboard
          id="franchess-play"
          position={position}
          boardWidth={board.width}
          onPieceDrop={onDrop}
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        />
      </section>

      <section className="grid gap-4">
        <div className="rounded-md border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h1 className="text-2xl font-semibold">Gegen Coach spielen</h1>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["beginner", "intermediate", "strong", "max"] as CoachDifficulty[]).map((level) => (
              <button
                type="button"
                key={level}
                onClick={() => setDifficulty(level)}
                className={`h-10 rounded-md text-sm ${
                  difficulty === level
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                    : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                }`}
              >
                {labelFor(level)}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-md bg-stone-100 p-4 text-sm leading-6 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
            {isThinking ? "Coach denkt..." : coachNote}
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Engine: {engineStatus.label} · WASM: {engineStatus.wasmActive ? "aktiv" : "nicht aktiv"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton variant="quiet" onClick={reset} icon={<RotateCcw size={16} />}>
              Neu starten
            </ActionButton>
            <ActionButton onClick={() => void searchBetterMove()} icon={<Lightbulb size={16} />}>
              Besseren Zug suchen
            </ActionButton>
          </div>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
          Niedrige Level wählen bewusst aus mehreren plausiblen Zügen. Maximal nutzt die tiefste verfügbare Engine-Stufe.
        </div>
      </section>
    </div>
  );
}

function labelFor(level: CoachDifficulty): string {
  const labels: Record<CoachDifficulty, string> = {
    beginner: "Anfänger",
    intermediate: "Fortgeschritten",
    strong: "Stark",
    max: "Maximal"
  };
  return labels[level];
}
