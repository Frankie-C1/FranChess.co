import { Chess, type Move } from "chess.js";
import { getPhase } from "../chess/position";
import { stockfishService } from "../stockfish/StockfishService";
import { classifyMove } from "./classifier";
import type { AnalysisDepth, MoveAnalysis, StoredGame } from "../../types";

export async function analyzeGame(
  game: StoredGame,
  depth: AnalysisDepth,
  onProgress?: (progress: number) => void
): Promise<StoredGame> {
  const chess = new Chess();
  chess.loadPgn(game.pgn, { strict: false });
  const verboseMoves = chess.history({ verbose: true });
  const replay = new Chess();
  const pieceMoveCounts = new Map<string, number>();
  const analysis: MoveAnalysis[] = [];

  for (let index = 0; index < verboseMoves.length; index += 1) {
    const move = verboseMoves[index] as Move;
    const fenBefore = replay.fen();
    const before = new Chess(fenBefore);
    const evalBefore = await stockfishService.evaluateFen(fenBefore, depth);
    const applied = replay.move(move.san);
    const fenAfter = replay.fen();
    const after = new Chess(fenAfter);
    const evalAfter = await stockfishService.evaluateFen(fenAfter, depth);
    const color = move.color;
    const moveNumber = Math.floor(index / 2) + 1;
    const cpLoss = calculateCentipawnLoss(color, evalBefore.cp, evalAfter.cp, evalBefore.mate, evalAfter.mate);
    const pieceKey = `${color}:${move.piece}:${move.from}`;
    const previousPieceMoves = pieceMoveCounts.get(pieceKey) ?? 0;
    pieceMoveCounts.set(pieceKey, previousPieceMoves + 1);

    const base = {
      id: crypto.randomUUID(),
      gameId: game.id,
      fenBefore,
      fenAfter,
      playedMove: move.san,
      playedUci: `${move.from}${move.to}${move.promotion ?? ""}`,
      bestMove: evalBefore.bestMove,
      evalBefore: evalBefore.cp,
      evalAfter: evalAfter.cp,
      mateScore: evalBefore.mate ?? evalAfter.mate,
      centipawnLoss: cpLoss,
      moveNumber,
      ply: index + 1,
      color,
      phase: getPhase(before, index),
      clock: extractClockComment(move)
    };

    const classification = classifyMove({
      before,
      after,
      analysis: base,
      previousPieceMoves,
      clock: base.clock
    });

    analysis.push({
      ...base,
      categories: classification.categories,
      explanation: classification.explanation
    });

    onProgress?.((index + 1) / verboseMoves.length);
  }

  return {
    ...game,
    analyzedAt: new Date().toISOString(),
    analysis
  };
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

function extractClockComment(move: Move): string | undefined {
  const comment = "comment" in move ? String(move.comment ?? "") : "";
  const match = comment.match(/\[%clk\s+([^\]]+)\]/);
  return match?.[1];
}
