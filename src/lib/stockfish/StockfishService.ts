import { Chess } from "chess.js";
import { estimatePosition } from "../chess/position";
import type { AnalysisDepth, CoachDifficulty, CoachStyle, EngineEvaluation } from "../../types";

const depthMap: Record<AnalysisDepth, number> = {
  quick: 8,
  normal: 12,
  deep: 16
};

const difficultyMap: Record<CoachDifficulty, number> = {
  beginner: 3,
  intermediate: 7,
  strong: 11,
  max: 16
};

interface PendingRequest {
  resolve: (value: EngineEvaluation) => void;
  reject: (reason?: unknown) => void;
  bestMove: string | null;
  score: { cp: number | null; mate: number | null };
  fen: string;
}

type EngineMode = "stockfish-wasm" | "fallback";

interface EngineStatus {
  mode: EngineMode;
  label: string;
  wasmActive: boolean;
  workerUrl: string;
  wasmUrl: string;
}

interface StyledMoveSuggestion {
  move: string | null;
  explanation: string;
}

export class StockfishService {
  private worker: Worker | null = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private pending: PendingRequest | null = null;
  private engineMode: EngineMode = "fallback";
  private readonly workerUrl = "/stockfish/stockfish.js";
  private readonly wasmUrl = "/stockfish/stockfish.wasm";

  async init(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      let sawUciOk = false;
      let sawReadyOk = false;
      const finish = () => {
        if (!sawUciOk || !sawReadyOk) return;
        this.engineMode = "stockfish-wasm";
        this.ready = true;
        resolve();
      };

      const timeout = window.setTimeout(() => {
        this.worker?.terminate();
        this.worker = null;
        this.engineMode = "fallback";
        this.ready = true;
        resolve();
      }, 8000);

      try {
        this.worker = new Worker(this.workerUrl);
        this.worker.onerror = () => {
          window.clearTimeout(timeout);
          this.worker?.terminate();
          this.worker = null;
          this.engineMode = "fallback";
          this.ready = true;
          resolve();
        };
        this.worker.onmessage = (event) => {
          const line = String(event.data);

          if (line === "uciok") {
            sawUciOk = true;
            this.post("isready");
          } else if (line === "readyok") {
            sawReadyOk = true;
            window.clearTimeout(timeout);
            finish();
          }

          this.handleMessage(line);
        };
        this.post("uci");
      } catch {
        window.clearTimeout(timeout);
        this.worker = null;
        this.engineMode = "fallback";
        this.ready = true;
        resolve();
      }
    });

    return this.initPromise;
  }

  get isRealEngineAvailable(): boolean {
    return this.engineMode === "stockfish-wasm" && Boolean(this.worker);
  }

  get status(): EngineStatus {
    return {
      mode: this.engineMode,
      label: this.isRealEngineAvailable ? "Stockfish 18 lite single-threaded WASM" : "Fallback-Heuristik",
      wasmActive: this.isRealEngineAvailable,
      workerUrl: this.workerUrl,
      wasmUrl: this.wasmUrl
    };
  }

  async evaluateFen(fen: string, depth: AnalysisDepth = "normal"): Promise<EngineEvaluation> {
    await this.init();

    if (!this.worker) {
      return this.fallbackEvaluate(fen, depthMap[depth]);
    }

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        if (this.pending) {
          const fallback = this.fallbackEvaluateSync(fen, depthMap[depth]);
          this.pending = null;
          resolve(fallback);
        }
      }, 5500);

      this.pending = {
        bestMove: null,
        score: { cp: null, mate: null },
        fen,
        resolve: (value) => {
          window.clearTimeout(timeout);
          resolve(value);
        },
        reject: (reason) => {
          window.clearTimeout(timeout);
          reject(reason);
        }
      };
      this.post(`position fen ${fen}`);
      this.post(`go depth ${depthMap[depth]}`);
    });
  }

  async chooseMove(fen: string, difficulty: CoachDifficulty): Promise<string | null> {
    await this.init();
    const depth = difficultyMap[difficulty];

    if (this.isRealEngineAvailable && difficulty === "max") {
      const evalResult = await this.evaluateFen(fen, "deep");
      return evalResult.bestMove;
    }

    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return null;

    const scored = legalMoves.map((move) => {
      const clone = new Chess(fen);
      clone.move(move.san);
      const score = estimatePosition(clone.fen()) * (chess.turn() === "w" ? 1 : -1);
      return { move: `${move.from}${move.to}${move.promotion ?? ""}`, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const windowSize = difficulty === "beginner" ? 6 : difficulty === "intermediate" ? 4 : 2;
    const chosen = scored[Math.min(scored.length - 1, Math.floor(Math.random() * windowSize))];
    return chosen.move;
  }

  async chooseMoveWithStyle(fen: string, difficulty: CoachDifficulty, style: CoachStyle): Promise<StyledMoveSuggestion> {
    if (style === "stockfish") {
      const move = await this.chooseMove(fen, difficulty);
      return {
        move,
        explanation: move ? "Stockfish-orientiert: objektiv stärkster verfügbarer Kandidat." : "Kein legaler Zug verfügbar."
      };
    }

    return this.suggestMove(fen, style, difficulty === "max" || difficulty === "strong" ? "normal" : "quick");
  }

  async suggestMove(fen: string, style: CoachStyle, depth: AnalysisDepth = "normal"): Promise<StyledMoveSuggestion> {
    await this.init();
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return { move: null, explanation: "Kein legaler Zug verfügbar." };

    const engine = await this.evaluateFen(fen, depth);
    if (style === "stockfish" && engine.bestMove) {
      return { move: engine.bestMove, explanation: "Stockfish: objektiv bester bekannter Engine-Zug in dieser Stellung." };
    }

    const turnMultiplier = chess.turn() === "w" ? 1 : -1;
    const scored = legalMoves.map((move) => {
      const clone = new Chess(fen);
      clone.move(move.san);
      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
      const base = estimatePosition(clone.fen()) * turnMultiplier;
      return {
        uci,
        score: base + styleBonus(style, chess, clone, move.san, uci, engine.bestMove),
        san: move.san
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0];
    return {
      move: chosen?.uci ?? engine.bestMove,
      explanation: explainStyleChoice(style, chosen?.san ?? chosen?.uci ?? engine.bestMove)
    };
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private handleMessage(line: string): void {
    if (!this.pending) return;

    const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
    if (scoreMatch) {
      const multiplier = sideToMove(this.pending.fen) === "w" ? 1 : -1;
      if (scoreMatch[1] === "cp") {
        this.pending.score.cp = Number(scoreMatch[2]) * multiplier;
        this.pending.score.mate = null;
      } else {
        this.pending.score.cp = null;
        this.pending.score.mate = Number(scoreMatch[2]) * multiplier;
      }
    }

    const pvMove = line.match(/\spv\s([a-h][1-8][a-h][1-8][qrbn]?)/);
    if (pvMove) {
      this.pending.bestMove = pvMove[1];
    }

    if (line.startsWith("bestmove")) {
      const bestMove = line.split(" ")[1] || this.pending.bestMove;
      const result = {
        cp: this.pending.score.cp,
        mate: this.pending.score.mate,
        bestMove
      };
      this.pending.resolve(result);
      this.pending = null;
    }
  }

  private post(command: string): void {
    this.worker?.postMessage(command);
  }

  private async fallbackEvaluate(fen: string, depth: number): Promise<EngineEvaluation> {
    return this.fallbackEvaluateSync(fen, depth);
  }

  private fallbackEvaluateSync(fen: string, depth: number): EngineEvaluation {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    let bestMove: string | null = legalMoves[0] ? `${legalMoves[0].from}${legalMoves[0].to}${legalMoves[0].promotion ?? ""}` : null;
    let bestScore = chess.turn() === "w" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

    for (const move of legalMoves.slice(0, Math.max(legalMoves.length, depth))) {
      const clone = new Chess(fen);
      clone.move(move.san);
      const score = estimatePosition(clone.fen());
      if ((chess.turn() === "w" && score > bestScore) || (chess.turn() === "b" && score < bestScore)) {
        bestScore = score;
        bestMove = `${move.from}${move.to}${move.promotion ?? ""}`;
      }
    }

    return {
      cp: estimatePosition(fen),
      mate: null,
      bestMove
    };
  }
}

export const stockfishService = new StockfishService();

function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function styleBonus(style: CoachStyle, before: Chess, after: Chess, san: string, uci: string, engineBest: string | null): number {
  let bonus = engineBest === uci ? 120 : 0;
  const isCapture = san.includes("x");
  const givesCheck = san.includes("+") || san.includes("#");
  const targetFile = uci[2];
  const targetRank = Number(uci[3]);
  const center = ["d", "e"].includes(targetFile) && targetRank >= 3 && targetRank <= 6;
  const development = /^[NB]/.test(san) && before.history().length < 12;
  const castle = san === "O-O" || san === "O-O-O";

  if (style === "magnus") {
    bonus += castle ? 70 : 0;
    bonus += center ? 45 : 0;
    bonus += development ? 35 : 0;
    bonus += givesCheck && !isCapture ? -15 : 0;
    bonus += after.inCheck() ? -30 : 0;
  } else if (style === "hikaru") {
    bonus += givesCheck ? 90 : 0;
    bonus += isCapture ? 45 : 0;
    bonus += center ? 25 : 0;
    bonus += development ? 20 : 0;
  } else if (style === "kasparov") {
    bonus += center ? 70 : 0;
    bonus += development ? 55 : 0;
    bonus += givesCheck ? 45 : 0;
    bonus += isCapture ? 25 : 0;
    bonus += castle ? 20 : 0;
  }

  return bonus;
}

function explainStyleChoice(style: CoachStyle, move: string | null | undefined): string {
  const prefix = move ? `${move}: ` : "";
  const map: Record<CoachStyle, string> = {
    stockfish: "objektiv bester Engine-Kandidat.",
    magnus: "Stil-Simulation: solide, positionell und mit Fokus auf langfristigen Druck.",
    hikaru: "Stil-Simulation: aktiv, taktisch und auf Initiative ausgerichtet.",
    kasparov: "Stil-Simulation: Raum, Zentrum, Aktivität und Angriffsdruck stehen im Vordergrund."
  };
  return `${prefix}${map[style]}`;
}
