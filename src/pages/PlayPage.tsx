import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Lightbulb, RotateCcw } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { useResponsiveBoardWidth } from "../components/useResponsiveBoardWidth";
import { buildCoachProfile } from "../lib/analysis/profile";
import { buildSquareStyles, canSelectPiece, tryMove, uciToArrow } from "../lib/chess/boardUi";
import { stockfishService } from "../lib/stockfish/StockfishService";
import type { AppSettings, CoachDifficulty, CoachStyle, StoredGame } from "../types";

export function PlayPage({ settings, games }: { settings: AppSettings; games: StoredGame[] }) {
  const [game, setGame] = useState(() => new Chess());
  const [difficulty, setDifficulty] = useState<CoachDifficulty>("intermediate");
  const [coachStyle, setCoachStyle] = useState<CoachStyle>("stockfish");
  const [suggestionStyle, setSuggestionStyle] = useState<CoachStyle>("stockfish");
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [coachNote, setCoachNote] = useState("Spiele mit Weiß. Der Coach gibt kurzes Feedback über dem Brett.");
  const [detailNote, setDetailNote] = useState("Stil-Simulationen nutzen Engine-Kandidaten plus einfache Heuristiken, keine echten Spielerprofile.");
  const [isThinking, setIsThinking] = useState(false);
  const [engineStatus, setEngineStatus] = useState(() => stockfishService.status);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [suggestionMove, setSuggestionMove] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const board = useResponsiveBoardWidth();
  const position = useMemo(() => game.fen(), [game]);
  const hasStarted = moveCount > 0;
  const profile = useMemo(() => buildCoachProfile(games), [games]);
  const squareStyles = useMemo(
    () => buildSquareStyles({ fen: position, selectedSquare, showLegalMoves: settings.showLegalMoves }),
    [position, selectedSquare, settings.showLegalMoves]
  );
  const arrows = useMemo(() => uciToArrow(suggestionMove, "rgba(212, 175, 55, 0.82)"), [suggestionMove]);

  function canUserMoveFrom(square: Square) {
    return !isThinking && !game.isGameOver() && game.turn() === playerColor && canSelectPiece(position, square, false, playerColor);
  }

  function onDrop(sourceSquare: Square, targetSquare: Square) {
    if (!canUserMoveFrom(sourceSquare)) return false;
    const beforeFen = game.fen();
    const move = tryMove(beforeFen, sourceSquare, targetSquare);
    setSelectedSquare(null);
    setSuggestionMove(null);
    if (!move) return false;

    const next = new Chess(move.fen);
    setGame(next);
    setMoveCount((count) => count + 1);
    void reviewAndReply(beforeFen, next, move.san);
    return true;
  }

  function onSquareClick(square: Square) {
    if (selectedSquare) {
      const moved = onDrop(selectedSquare, square);
      if (moved) return;
    }
    setSelectedSquare(canUserMoveFrom(square) ? square : null);
  }

  async function reviewAndReply(beforeFen: string, next: Chess, san: string) {
    const before = await stockfishService.evaluateFen(beforeFen, "quick");
    const after = await stockfishService.evaluateFen(next.fen(), "quick");
    setEngineStatus(stockfishService.status);
    const loss = calculateCentipawnLoss(playerColor, before.cp, after.cp, before.mate, after.mate);
    const pattern = profile.topCategories[0]?.category
      ? ` Das passt zu deinem Muster: ${humanCategory(profile.topCategories[0].category)}.`
      : "";
    const feedback =
      loss > 220
        ? `Ungenaue Entscheidung: ${san} verliert spürbar an Kontrolle.${pattern}`
        : loss > 90
          ? `Spielbar, aber prüfe nach ${san} noch gegnerische Taktik.${pattern}`
          : `Guter Zug: ${san}.`;

    await playCoachMove(next, feedback);
  }

  async function playCoachMove(current: Chess, feedback = "") {
    if (current.isGameOver()) {
      setCoachNote("Partie beendet.");
      return;
    }
    setIsThinking(true);
    const suggestion = await stockfishService.chooseMoveWithStyle(current.fen(), difficulty, coachStyle);
    setEngineStatus(stockfishService.status);
    const reply = new Chess(current.fen());
    if (suggestion.move) {
      reply.move({ from: suggestion.move.slice(0, 2), to: suggestion.move.slice(2, 4), promotion: suggestion.move[4] || "q" });
      setMoveCount((count) => count + 1);
    }
    setGame(reply);
    setCoachNote(feedback || (suggestion.move ? `Coach spielte ${suggestion.move}.` : "Coach findet keinen legalen Zug."));
    setDetailNote(`${suggestion.move ? `Coach spielte ${suggestion.move}. ` : ""}${suggestion.explanation}`);
    setIsThinking(false);
  }

  function reset(nextColor: "w" | "b" = playerColor) {
    setGame(new Chess());
    setPlayerColor(nextColor);
    setSelectedSquare(null);
    setSuggestionMove(null);
    setMoveCount(0);
    setCoachNote(nextColor === "w" ? "Neue Partie. Spiele mit Weiß." : "Neue Partie. Du spielst Schwarz; der Coach beginnt.");
    setDetailNote("Stil-Simulationen nutzen Engine-Kandidaten plus einfache Heuristiken, keine echten Spielerprofile.");
    if (nextColor === "b") {
      void playCoachMove(new Chess(), "Du spielst Schwarz. Der Coach macht den ersten weißen Zug.");
    }
  }

  async function searchBetterMove() {
    if (game.turn() !== playerColor || game.isGameOver()) {
      setCoachNote("Der Vorschlag ist verfügbar, wenn du am Zug bist.");
      return;
    }
    const suggestion = await stockfishService.suggestMove(game.fen(), suggestionStyle, "normal");
    setEngineStatus(stockfishService.status);
    setSuggestionMove(suggestion.move);
    setCoachNote(suggestion.move ? `Besserer Zug: ${suggestion.move}` : "Kein Vorschlag verfügbar.");
    setDetailNote(suggestion.explanation);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <section className="grid gap-3">
        <div className="rounded-md border border-stone-200 bg-white p-3 text-sm font-medium text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
          {isThinking ? "Coach denkt..." : coachNote}
        </div>
        <div ref={board.ref} className="flex flex-col items-center overflow-hidden rounded-md border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <Chessboard
            id="franchess-play"
            position={position}
            boardWidth={board.width}
            boardOrientation={playerColor === "b" ? "black" : "white"}
            onPieceDrop={onDrop}
            onSquareClick={(square) => onSquareClick(square as Square)}
            isDraggablePiece={({ sourceSquare }) => canUserMoveFrom(sourceSquare as Square)}
            customSquareStyles={squareStyles}
            customArrows={arrows}
            areArrowsAllowed={false}
            autoPromoteToQueen
            customDarkSquareStyle={{ backgroundColor: "#769656" }}
            customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
          />
        </div>
      </section>

      <section className="grid gap-4">
        <div className="rounded-md border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h1 className="text-2xl font-semibold">Gegen Coach spielen</h1>
          {!hasStarted && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => reset("w")} className={sideButton(playerColor === "w")}>
                Als Weiß spielen
              </button>
              <button type="button" onClick={() => reset("b")} className={sideButton(playerColor === "b")}>
                Als Schwarz spielen
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["beginner", "intermediate", "strong", "max"] as CoachDifficulty[]).map((level) => (
              <button type="button" key={level} onClick={() => setDifficulty(level)} className={pillButton(difficulty === level)}>
                {labelFor(level)}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {(["stockfish", "magnus", "hikaru", "kasparov"] as CoachStyle[]).map((style) => (
              <button type="button" key={style} onClick={() => setCoachStyle(style)} className={pillButton(coachStyle === style)}>
                {styleLabel(style)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">Coach-Stile sind regelbasierte Stil-Simulationen, keine echten Kopien von Spielern.</p>

          <div className="mt-4 rounded-md bg-stone-100 p-4 text-sm leading-6 text-stone-700 dark:bg-stone-800 dark:text-stone-200">{detailNote}</div>
          <p className="mt-3 text-xs text-stone-500">
            Engine: {engineStatus.label} · WASM: {engineStatus.wasmActive ? "aktiv" : "nicht aktiv"}
          </p>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Vorschlagsstil</span>
              <select
                value={suggestionStyle}
                onChange={(event) => setSuggestionStyle(event.target.value as CoachStyle)}
                className="h-11 rounded-md border border-stone-300 bg-white px-3 dark:border-stone-700 dark:bg-stone-950"
              >
                {(["stockfish", "magnus", "hikaru", "kasparov"] as CoachStyle[]).map((style) => (
                  <option key={style} value={style}>
                    {styleLabel(style)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <ActionButton variant="quiet" onClick={() => reset()} icon={<RotateCcw size={16} />}>
                Neu starten
              </ActionButton>
              <ActionButton onClick={() => void searchBetterMove()} icon={<Lightbulb size={16} />}>
                Besseren Zug vorschlagen
              </ActionButton>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
          Niedrige Level wählen bewusst aus mehreren plausiblen Zügen. Maximal nutzt die tiefste verfügbare Engine-Stufe.
        </div>
      </section>
    </div>
  );
}

function calculateCentipawnLoss(
  color: "w" | "b",
  beforeCp: number | null,
  afterCp: number | null,
  beforeMate: number | null,
  afterMate: number | null
): number {
  if (beforeMate !== null && afterMate === null) return 500;
  if (beforeCp === null || afterCp === null) return 0;
  const raw = color === "w" ? beforeCp - afterCp : afterCp - beforeCp;
  return Math.max(0, raw);
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

function styleLabel(style: CoachStyle): string {
  const labels: Record<CoachStyle, string> = {
    stockfish: "Stockfish",
    magnus: "Magnus-Stil",
    hikaru: "Hikaru-Stil",
    kasparov: "Kasparov-Stil"
  };
  return labels[style];
}

function humanCategory(category: string): string {
  const labels: Record<string, string> = {
    hanging_piece: "du übersiehst häufig hängende Figuren",
    undefended_piece: "ungedeckte Figuren werden oft zu spät bemerkt",
    king_safety: "Königssicherheit kostet dich wiederholt Tempo",
    bad_development: "die Entwicklung bleibt häufiger zurück",
    missed_mate: "entscheidende Mattmotive werden übersehen",
    tactical_blunder: "Taktiken des Gegners bekommen zu viel Raum"
  };
  return labels[category] ?? "dieser Fehlertyp taucht öfter in deinen Partien auf";
}

function pillButton(active: boolean): string {
  return `h-10 rounded-md text-sm ${
    active ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950" : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
  }`;
}

function sideButton(active: boolean): string {
  return `h-11 rounded-md text-sm font-medium ${
    active ? "bg-[#5f8f45] text-white" : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
  }`;
}
