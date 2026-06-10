import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Lightbulb, RotateCcw, SlidersHorizontal } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { BoardControls } from "../components/BoardControls";
import { CapturedMaterialDisplay } from "../components/CapturedMaterialDisplay";
import { EvaluationBar } from "../components/EvaluationBar";
import { MoveJudgementBadge } from "../components/MoveJudgementBadge";
import { MoveSuggestionPanel } from "../components/MoveSuggestionPanel";
import { useKeyboardNavigation } from "../components/useKeyboardNavigation";
import { useResponsiveBoardWidth } from "../components/useResponsiveBoardWidth";
import { buildCoachProfile } from "../lib/analysis/profile";
import { judgeMove, neutralJudgement } from "../lib/analysis/moveJudgement";
import { boardColorsFor, buildSquareStyles, candidatesToArrows, canSelectPiece, formatEval, pieceColorAt, tryMove } from "../lib/chess/boardUi";
import { engineUnavailableMessage, stockfishService } from "../lib/stockfish/StockfishService";
import type { AppSettings, EngineCandidateMove, MoveJudgement, StoredGame } from "../types";

interface CoachHistoryEntry {
  fen: string;
  san?: string;
  uci?: string;
  by?: "user" | "coach";
  note?: string;
  cp: number | null;
  mate: number | null;
  judgement: MoveJudgement | null;
}

const startFen = new Chess().fen();
const engineEloOptions = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, "max"] as const;

export function PlayPage({
  settings,
  onSettingsChange,
  games
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  games: StoredGame[];
}) {
  const [history, setHistory] = useState<CoachHistoryEntry[]>([{ fen: startFen, cp: null, mate: null, judgement: null }]);
  const [currentPly, setCurrentPly] = useState(0);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [coachNote, setCoachNote] = useState("Spiele mit Weiß. Der Coach nutzt echte Stockfish-Züge.");
  const [detailNote, setDetailNote] = useState("Wähle eine Engine-Elo. Maximal deaktiviert UCI_LimitStrength.");
  const [isThinking, setIsThinking] = useState(false);
  const [engineStatus, setEngineStatus] = useState(() => stockfishService.status);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [suggestions, setSuggestions] = useState<EngineCandidateMove[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [boardVersion, setBoardVersion] = useState(0);
  const [lastUserEntry, setLastUserEntry] = useState<CoachHistoryEntry | null>(null);
  const [lastCoachReply, setLastCoachReply] = useState<CoachHistoryEntry | null>(null);
  const board = useResponsiveBoardWidth(settings.coachSettingsCollapsed ? 500 : 400);
  const profile = useMemo(() => buildCoachProfile(games), [games]);
  const current = history[currentPly] ?? history[history.length - 1];
  const position = current.fen;
  const game = useMemo(() => new Chess(position), [position]);
  const hasStarted = history.length > 1;
  const atLatest = currentPly === history.length - 1;
  const orientation = playerColor === "b" ? "black" : "white";
  const squareStyles = useMemo(
    () => buildSquareStyles({ fen: position, selectedSquare, showLegalMoves: settings.showLegalMoves }),
    [position, selectedSquare, settings.showLegalMoves]
  );
  const arrows = useMemo(() => candidatesToArrows(suggestions), [suggestions]);
  const boardColors = useMemo(
    () => boardColorsFor(settings.boardTheme, settings.colorTheme, settings.darkMode),
    [settings.boardTheme, settings.colorTheme, settings.darkMode]
  );

  useKeyboardNavigation({ enabled: true, current: currentPly, max: history.length - 1, onChange: setCurrentPly });

  function updateSettings(next: Partial<AppSettings>) {
    onSettingsChange({ ...settings, ...next });
  }

  function canUserMoveFrom(square: Square) {
    return !isThinking && !game.isGameOver() && game.turn() === playerColor && canSelectPiece(position, square, false, playerColor);
  }

  function onDrop(sourceSquare: Square, targetSquare: Square) {
    if (!canUserMoveFrom(sourceSquare)) return false;
    const move = tryMove(position, sourceSquare, targetSquare);
    setSelectedSquare(null);
    setSuggestions([]);
    if (!move) {
      setBoardVersion((value) => value + 1);
      return false;
    }
    void reviewUserMove(position, move.fen, move.san, move.uci, currentPly);
    return true;
  }

  function onSquareClick(square: Square) {
    if (selectedSquare) {
      const targetColor = pieceColorAt(position, square);
      const selectedColor = pieceColorAt(position, selectedSquare);
      if (targetColor && targetColor === selectedColor && canUserMoveFrom(square)) {
        setSelectedSquare(square);
        return;
      }

      const moved = onDrop(selectedSquare, square);
      if (moved) return;
    }
    setSelectedSquare(canUserMoveFrom(square) ? square : null);
  }

  async function reviewUserMove(beforeFen: string, afterFen: string, san: string, uci: string, branchFromPly: number) {
    setIsThinking(true);
    setSuggestionError("");
    setLastCoachReply(null);
    try {
      const before = await stockfishService.getTopMoves(beforeFen, settings.engineElo, "quick", 5);
      const after = await stockfishService.evaluateFen(afterFen, "quick", settings.engineElo);
      setEngineStatus(stockfishService.status);
      const loss = calculateCentipawnLoss(playerColor, before.cp, after.cp, before.mate, after.mate);
      const judgement = judgeMove({
        playedUci: uci,
        bestMove: before.bestMove,
        centipawnLoss: loss,
        candidates: before.candidateMoves
      });
      const pattern = profile.topCategories[0]?.category ? ` Muster aus deinen Partien: ${humanCategory(profile.topCategories[0].category)}.` : "";
      const variantPrefix = branchFromPly < history.length - 1 ? "Neue Variante gestartet. " : "";
      const userEntry: CoachHistoryEntry = {
        fen: afterFen,
        san,
        uci,
        by: "user",
        cp: after.cp,
        mate: after.mate,
        judgement,
        note: `${variantPrefix}${judgement.symbol} ${judgement.text} - ${judgement.comment}${pattern}`
      };
      const userPly = branchFromPly + 1;
      setHistory((currentHistory) => currentHistory.slice(0, branchFromPly + 1).concat(userEntry));
      setCurrentPly(userPly);
      setLastUserEntry(userEntry);
      setCoachNote(`Dein letzter Zug: ${judgement.symbol} ${judgement.text} - ${Math.round(loss)} cp Verlust. ${formatEval(after.cp, after.mate)}`);
      setDetailNote(userEntry.note ?? neutralJudgement(after.cp, after.mate));
      await playCoachMove(afterFen, userPly);
    } catch (error) {
      const message = error instanceof Error ? error.message : engineUnavailableMessage;
      setCoachNote(message);
      setDetailNote("Coach-Züge sind deaktiviert, bis Stockfish korrekt geladen ist.");
      setSuggestionError(message);
      setIsThinking(false);
    }
  }

  async function playCoachMove(fen: string, appendAfterPly: number) {
    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      setCoachNote("Partie beendet.");
      setIsThinking(false);
      return;
    }

    try {
      const moveUci = await stockfishService.chooseMove(fen, settings.engineElo);
      setEngineStatus(stockfishService.status);
      if (!moveUci) {
        setCoachNote("Stockfish findet keinen legalen Zug.");
        setIsThinking(false);
        return;
      }
      await waitForCoachDelay();
      const move = chess.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci[4] || "q" });
      if (!move) {
        setCoachNote(`Stockfish lieferte einen illegalen Zug: ${moveUci}`);
        setIsThinking(false);
        return;
      }
      const evaluation = await stockfishService.evaluateFen(chess.fen(), "quick", settings.engineElo);
      const coachEntry: CoachHistoryEntry = {
        fen: chess.fen(),
        san: move.san,
        uci: moveUci,
        by: "coach",
        cp: evaluation.cp,
        mate: evaluation.mate,
        judgement: null,
        note: `Coach antwortete: ${move.san}. ${neutralJudgement(evaluation.cp, evaluation.mate)}`
      };
      setHistory((currentHistory) => {
        const next = currentHistory.slice(0, appendAfterPly + 1).concat(coachEntry);
        window.setTimeout(() => setCurrentPly(next.length - 1), 0);
        return next;
      });
      setLastCoachReply(coachEntry);
      setDetailNote(lastUserEntry?.note ?? coachEntry.note ?? "");
    } catch (error) {
      const message = error instanceof Error ? error.message : engineUnavailableMessage;
      setCoachNote(message);
      setDetailNote("Coach-Züge sind deaktiviert, bis Stockfish korrekt geladen ist.");
    } finally {
      setIsThinking(false);
    }
  }

  function reset(nextColor: "w" | "b" = playerColor) {
    setHistory([{ fen: startFen, cp: null, mate: null, judgement: null }]);
    setCurrentPly(0);
    setPlayerColor(nextColor);
    setSelectedSquare(null);
    setSuggestions([]);
    setSuggestionError("");
    setLastUserEntry(null);
    setLastCoachReply(null);
    setCoachNote(nextColor === "w" ? "Neue Partie. Spiele mit Weiß." : "Neue Partie. Du spielst Schwarz; Stockfish beginnt.");
    setDetailNote("Wähle eine Engine-Elo. Maximal deaktiviert UCI_LimitStrength.");
    if (nextColor === "b") {
      setIsThinking(true);
      void playCoachMove(startFen, 0);
    }
  }

  async function suggestMoves() {
    setIsSuggesting(true);
    setSuggestionError("");
    setSuggestions([]);
    try {
      const result = await stockfishService.getTopMoves(position, settings.engineElo, "normal", 5);
      setEngineStatus(stockfishService.status);
      setSuggestions(result.candidateMoves);
      if (!result.multipvAvailable && result.bestMove) {
        setSuggestionError("Nur bester Zug verfügbar.");
      }
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : engineUnavailableMessage);
    } finally {
      setIsSuggesting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(430px,570px)_minmax(300px,1fr)]">
      <section className="grid gap-3">
        <div className="hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm font-medium text-[var(--color-text)]">
          {isThinking ? "Coach denkt ..." : coachNote}
          {!atLatest && <p className="mt-1 text-xs text-[var(--color-muted)]">Du bist in einer früheren Stellung. Ein neuer Zug startet ab hier eine neue Linie.</p>}
        </div>
        <div ref={board.ref} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 md:grid-cols-[36px_minmax(0,1fr)_48px]">
            <EvaluationBar cp={current.cp} mate={current.mate} />
            <div className="board-touch-area flex justify-center overflow-hidden">
              <Chessboard
                key={`coach-${boardVersion}`}
                id="franchess-play"
                position={position}
                boardWidth={board.width}
                boardOrientation={orientation}
                onPieceDrop={onDrop}
                onSquareClick={(square) => onSquareClick(square as Square)}
                isDraggablePiece={({ sourceSquare }) => canUserMoveFrom(sourceSquare as Square)}
                customSquareStyles={squareStyles}
                customArrows={arrows}
                areArrowsAllowed={false}
                autoPromoteToQueen
                animationDuration={180}
                customDarkSquareStyle={{ backgroundColor: boardColors.dark }}
                customLightSquareStyle={{ backgroundColor: boardColors.light }}
              />
            </div>
            <div className="hidden md:block">
              <CapturedMaterialDisplay fen={position} orientation={orientation} layout="side" />
            </div>
          </div>
          <div className="mt-3 md:hidden">
            <CapturedMaterialDisplay fen={position} orientation={orientation} />
          </div>
          <div className="md:hidden">
            <BoardControls current={currentPly} max={history.length - 1} onChange={setCurrentPly} />
          </div>
        </div>
      </section>

      <section className="grid content-start gap-4">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">Gegen Coach spielen</h1>
            <ActionButton
              variant="quiet"
              onClick={() => updateSettings({ coachSettingsCollapsed: !settings.coachSettingsCollapsed })}
              icon={<SlidersHorizontal size={16} />}
            >
              {settings.coachSettingsCollapsed ? "Einstellungen anzeigen" : "Einstellungen einklappen"}
            </ActionButton>
          </div>
          <div className="mt-4 rounded-md bg-[var(--color-surface-2)] p-3 text-sm font-medium text-[var(--color-text)]">
            {isThinking ? "Coach denkt ..." : coachNote}
            {!atLatest && <p className="mt-1 text-xs text-[var(--color-muted)]">Du bist in einer früheren Stellung. Ein neuer Zug startet ab hier eine neue Linie.</p>}
          </div>
          <div className="hidden md:block">
            <BoardControls current={currentPly} max={history.length - 1} onChange={setCurrentPly} />
          </div>

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

          {!settings.coachSettingsCollapsed && (
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Engine-Elo</span>
                <select
                  value={settings.engineElo}
                  onChange={(event) => updateSettings({ engineElo: event.target.value === "max" ? "max" : Number(event.target.value) as AppSettings["engineElo"] })}
                  className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3"
                >
                  {engineEloOptions.map((elo) => (
                    <option key={elo} value={elo}>
                      {elo === "max" ? "Maximal" : elo}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-[var(--color-muted)]">
                UCI_Elo: {engineStatus.supportsElo ? "unterstützt" : "nicht bestätigt"} · LimitStrength: {engineStatus.supportsLimitStrength ? "unterstützt" : "nicht bestätigt"}
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-3">
            {lastUserEntry?.judgement && (
              <div>
                <p className="mb-2 text-sm font-semibold">Dein letzter Zug</p>
                <MoveJudgementBadge judgement={lastUserEntry.judgement} />
              </div>
            )}
            {lastCoachReply && (
              <p className="rounded-md bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]">{lastCoachReply.note}</p>
            )}
          </div>

          <div className="mt-4 rounded-md bg-[var(--color-surface-2)] p-4 text-sm leading-6 text-[var(--color-text)]">{detailNote}</div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Engine: {engineStatus.label} · Bewertung: {formatEval(current.cp, current.mate)}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton variant="quiet" onClick={() => reset()} icon={<RotateCcw size={16} />}>
              Neu starten
            </ActionButton>
            <ActionButton onClick={() => void suggestMoves()} disabled={isSuggesting || isThinking} icon={<Lightbulb size={16} />}>
              Zug vorschlagen
            </ActionButton>
          </div>
        </div>
        <MoveSuggestionPanel candidates={suggestions} isLoading={isSuggesting} error={suggestionError} />
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

function sideButton(active: boolean): string {
  return `h-11 rounded-md text-sm font-medium ${
    active ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]" : "bg-[var(--color-surface-2)] text-[var(--color-text)]"
  }`;
}

function waitForCoachDelay(): Promise<void> {
  const delay = 350 + Math.round(Math.random() * 350);
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}
