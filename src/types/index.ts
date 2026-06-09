export type CoachView = "home" | "upload" | "dashboard" | "viewer" | "play" | "training" | "export" | "settings";

export type AnalysisDepth = "quick" | "normal" | "deep";

export type CoachDifficulty = "beginner" | "intermediate" | "strong" | "max";

export type CoachStyle = "stockfish" | "magnus" | "hikaru" | "kasparov";

export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

export type ChessColor = "w" | "b";

export type MovePhase = "opening" | "middlegame" | "endgame";

export type MistakeCategory =
  | "blunder"
  | "mistake"
  | "inaccuracy"
  | "missed_mate"
  | "missed_tactic"
  | "hanging_piece"
  | "undefended_piece"
  | "missed_fork"
  | "missed_pin"
  | "missed_skewer"
  | "allowed_mate_threat"
  | "king_safety"
  | "bad_development"
  | "early_queen"
  | "repeated_piece_move"
  | "ignored_threat"
  | "opening_principle"
  | "endgame_error"
  | "tactical_blunder"
  | "exchange_blunder"
  | "pawn_structure_damage"
  | "time_pressure";

export interface AppSettings {
  darkMode: boolean;
  showLegalMoves: boolean;
  allowOpponentMoves: boolean;
}

export interface GameMetadata {
  white: string;
  black: string;
  result: GameResult;
  date: string;
  timeControl?: string;
  opening?: string;
  event?: string;
  site?: string;
  link?: string;
  whiteElo?: number;
  blackElo?: number;
}

export interface GameSource {
  provider: "pgn" | "chesscom";
  url?: string;
  importedBy?: string;
}

export interface StoredGame {
  id: string;
  pgn: string;
  metadata: GameMetadata;
  moves: string[];
  importedAt: string;
  analyzedAt?: string;
  analysis: MoveAnalysis[];
  source?: GameSource;
}

export interface EngineEvaluation {
  cp: number | null;
  mate: number | null;
  bestMove: string | null;
}

export interface MoveAnalysis {
  id: string;
  gameId: string;
  fenBefore: string;
  fenAfter: string;
  playedMove: string;
  playedUci: string;
  bestMove: string | null;
  evalBefore: number | null;
  evalAfter: number | null;
  mateScore: number | null;
  centipawnLoss: number;
  moveNumber: number;
  ply: number;
  color: ChessColor;
  phase: MovePhase;
  categories: MistakeCategory[];
  explanation: string;
  clock?: string;
}

export interface CoachProfile {
  playerName: string;
  gameCount: number;
  winrate: number;
  averageCentipawnLoss: number;
  topCategories: Array<{ category: MistakeCategory; count: number }>;
  openingCounts: Array<{ opening: string; count: number }>;
  diagnosis: string;
}

export interface TrainingTask {
  id: string;
  gameId: string;
  fen: string;
  moveNumber: number;
  category: MistakeCategory;
  prompt: string;
  bestMove: string | null;
}

export interface CoachUserProfile {
  chessComUsername?: string;
}

export interface StorageAdapter {
  loadGames(): Promise<StoredGame[]>;
  saveGames(games: StoredGame[]): Promise<void>;
  clear(): Promise<void>;
}
