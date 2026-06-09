import { Chess } from "chess.js";
import type { AnalysisDepth, EngineCandidateMove, EngineElo, EngineEvaluation } from "../../types";

const depthMap: Record<AnalysisDepth, number> = {
  quick: 8,
  normal: 12,
  deep: 16
};

export const engineUnavailableMessage = "Stockfish konnte nicht geladen werden. Bitte Engine-Dateien prüfen.";

interface PendingRequest {
  id: number;
  fen: string;
  resolve: (value: EngineEvaluation) => void;
  reject: (reason?: unknown) => void;
  bestMove: string | null;
  candidateMap: Map<number, EngineCandidateMove>;
  timeout: number;
}

interface EngineStatus {
  mode: "stockfish-wasm" | "unavailable";
  label: string;
  wasmActive: boolean;
  workerUrl: string;
  wasmUrl: string;
  supportsElo: boolean;
  supportsLimitStrength: boolean;
  supportsMultiPv: boolean;
  error: string | null;
}

export class StockfishUnavailableError extends Error {
  constructor(message = engineUnavailableMessage) {
    super(message);
    this.name = "StockfishUnavailableError";
  }
}

export class StockfishService {
  private worker: Worker | null = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private pending: PendingRequest | null = null;
  private requestId = 0;
  private readonly workerUrl = "/stockfish/stockfish.js";
  private readonly wasmUrl = "/stockfish/stockfish.wasm";
  private lastError: string | null = null;
  private supportedOptions = new Set<string>();
  private currentElo: EngineElo | null = null;

  async init(): Promise<void> {
    if (this.ready && this.worker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      let sawUciOk = false;
      let sawReadyOk = false;
      const fail = (message = engineUnavailableMessage) => {
        window.clearTimeout(timeout);
        this.worker?.terminate();
        this.worker = null;
        this.ready = false;
        this.initPromise = null;
        this.lastError = message;
        reject(new StockfishUnavailableError(message));
      };
      const finish = () => {
        if (!sawUciOk || !sawReadyOk) return;
        window.clearTimeout(timeout);
        this.ready = true;
        this.lastError = null;
        resolve();
      };

      const timeout = window.setTimeout(() => fail(), 8000);

      try {
        this.worker = new Worker(this.workerUrl);
        this.worker.onerror = () => fail();
        this.worker.onmessage = (event) => {
          const line = String(event.data);

          if (line.startsWith("option name ")) {
            const optionName = line.slice("option name ".length).split(" type ")[0];
            this.supportedOptions.add(optionName);
          } else if (line === "uciok") {
            sawUciOk = true;
            this.post("isready");
          } else if (line === "readyok") {
            sawReadyOk = true;
            finish();
          }

          this.handleMessage(line);
        };
        this.post("uci");
      } catch {
        fail();
      }
    });

    return this.initPromise;
  }

  get isRealEngineAvailable(): boolean {
    return this.ready && Boolean(this.worker);
  }

  get status(): EngineStatus {
    return {
      mode: this.isRealEngineAvailable ? "stockfish-wasm" : "unavailable",
      label: this.isRealEngineAvailable ? "Stockfish 18 lite single-threaded WASM" : engineUnavailableMessage,
      wasmActive: this.isRealEngineAvailable,
      workerUrl: this.workerUrl,
      wasmUrl: this.wasmUrl,
      supportsElo: this.supportedOptions.has("UCI_Elo"),
      supportsLimitStrength: this.supportedOptions.has("UCI_LimitStrength"),
      supportsMultiPv: this.supportedOptions.has("MultiPV"),
      error: this.lastError
    };
  }

  async evaluateFen(fen: string, depth: AnalysisDepth = "normal", engineElo: EngineElo = "max"): Promise<EngineEvaluation> {
    return this.analyzeFen(fen, { depth: depthMap[depth], multipv: 1, engineElo });
  }

  async getTopMoves(fen: string, engineElo: EngineElo, depth: AnalysisDepth = "normal", count = 5): Promise<EngineEvaluation> {
    return this.analyzeFen(fen, { depth: depthMap[depth], multipv: count, engineElo });
  }

  async chooseMove(fen: string, engineElo: EngineElo): Promise<string | null> {
    const evaluation = await this.evaluateFen(fen, engineElo === "max" ? "deep" : "normal", engineElo);
    return evaluation.bestMove;
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.initPromise = null;
    this.pending = null;
  }

  private async analyzeFen(
    fen: string,
    options: { depth: number; multipv: number; engineElo: EngineElo }
  ): Promise<EngineEvaluation> {
    await this.init();
    if (!this.worker) throw new StockfishUnavailableError();

    const chess = new Chess(fen);
    if (chess.moves().length === 0) {
      return { cp: null, mate: null, bestMove: null, candidateMoves: [], fen, multipvAvailable: false };
    }

    this.applyEngineStrength(options.engineElo);
    const multipv = Math.max(1, Math.min(5, options.multipv));
    if (this.supportedOptions.has("MultiPV")) {
      this.post(`setoption name MultiPV value ${multipv}`);
    }

    if (this.pending) {
      window.clearTimeout(this.pending.timeout);
      this.pending.reject(new Error("Engine request superseded by a newer position."));
      this.pending = null;
      this.post("stop");
    }

    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const timeout = window.setTimeout(() => {
        if (this.pending?.id !== id) return;
        this.pending = null;
        reject(new StockfishUnavailableError("Stockfish antwortet nicht rechtzeitig. Bitte Engine-Dateien prüfen."));
      }, 9000);

      this.pending = {
        id,
        fen,
        resolve,
        reject,
        bestMove: null,
        candidateMap: new Map(),
        timeout
      };

      this.post(`position fen ${fen}`);
      this.post(`go depth ${options.depth}`);
    });
  }

  private applyEngineStrength(engineElo: EngineElo): void {
    if (this.currentElo === engineElo) return;

    if (engineElo === "max") {
      if (this.supportedOptions.has("UCI_LimitStrength")) {
        this.post("setoption name UCI_LimitStrength value false");
      }
      this.currentElo = engineElo;
      return;
    }

    if (this.supportedOptions.has("UCI_LimitStrength")) {
      this.post("setoption name UCI_LimitStrength value true");
    }
    if (this.supportedOptions.has("UCI_Elo")) {
      this.post(`setoption name UCI_Elo value ${engineElo}`);
    }
    this.currentElo = engineElo;
  }

  private handleMessage(line: string): void {
    if (!this.pending) return;

    if (line.startsWith("info ")) {
      this.parseInfoLine(line, this.pending);
      return;
    }

    if (!line.startsWith("bestmove")) return;

    const pending = this.pending;
    window.clearTimeout(pending.timeout);
    this.pending = null;

    const rawBestMove = line.split(" ")[1] || pending.bestMove;
    const bestMove = this.validateBestMove(pending.fen, rawBestMove);
    if (rawBestMove && !bestMove) {
      this.lastError = `Stockfish lieferte einen illegalen Zug: ${rawBestMove}`;
      this.dispose();
      pending.reject(new Error(this.lastError));
      return;
    }

    const candidates = [...pending.candidateMap.values()]
      .filter((candidate) => this.validateBestMove(pending.fen, candidate.move))
      .sort((a, b) => a.rank - b.rank);
    const primary = candidates.find((candidate) => candidate.move === bestMove) ?? candidates[0] ?? null;
    const candidateMoves = bestMove ? ensureBestMoveCandidate(candidates, bestMove) : candidates;

    pending.resolve({
      cp: primary?.cp ?? null,
      mate: primary?.mate ?? null,
      bestMove,
      candidateMoves,
      fen: pending.fen,
      multipvAvailable: candidateMoves.length > 1
    });
  }

  private parseInfoLine(line: string, pending: PendingRequest): void {
    const pvMatch = line.match(/\spv\s(.+)$/);
    if (!pvMatch) return;

    const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
    const rank = multipvMatch ? Number(multipvMatch[1]) : 1;
    const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
    const pv = pvMatch[1].trim().split(/\s+/).filter(Boolean);
    const move = pv[0];
    if (!move) return;

    const multiplier = sideToMove(pending.fen) === "w" ? 1 : -1;
    const candidate: EngineCandidateMove = {
      rank,
      move,
      cp: scoreMatch?.[1] === "cp" ? Number(scoreMatch[2]) * multiplier : null,
      mate: scoreMatch?.[1] === "mate" ? Number(scoreMatch[2]) * multiplier : null,
      pv
    };
    pending.candidateMap.set(rank, candidate);
    if (rank === 1) pending.bestMove = move;
  }

  private validateBestMove(fen: string, move: string | null | undefined): string | null {
    if (!move || move === "(none)" || move.length < 4) return null;
    const chess = new Chess(fen);
    const legalMove = chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] || "q" });
    return legalMove ? move : null;
  }

  private post(command: string): void {
    this.worker?.postMessage(command);
  }
}

export const stockfishService = new StockfishService();

function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function ensureBestMoveCandidate(candidates: EngineCandidateMove[], bestMove: string): EngineCandidateMove[] {
  if (candidates.some((candidate) => candidate.move === bestMove)) return candidates;
  return [{ rank: 1, move: bestMove, cp: null, mate: null, pv: [bestMove] }, ...candidates].map((candidate, index) => ({
    ...candidate,
    rank: index + 1
  }));
}
