import { formatEval } from "../lib/chess/boardUi";
import type { EngineCandidateMove } from "../types";

export function MoveSuggestionPanel({
  candidates,
  isLoading,
  error
}: {
  candidates: EngineCandidateMove[];
  isLoading: boolean;
  error: string;
}) {
  if (isLoading) {
    return <div className="rounded-md bg-stone-100 p-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">Stockfish analysiert die Stellung...</div>;
  }

  if (error) {
    return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</div>;
  }

  if (candidates.length === 0) return null;

  return (
    <div className="rounded-md border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Top-Züge</h3>
        {candidates.length === 1 && <span className="text-xs text-stone-500">Nur bester Zug verfügbar.</span>}
      </div>
      <div className="grid gap-2">
        {candidates.slice(0, 5).map((candidate) => (
          <div key={`${candidate.rank}-${candidate.move}`} className="flex items-center justify-between gap-3 rounded-md bg-stone-100 px-3 py-2 text-sm dark:bg-stone-800">
            <span className="font-medium">
              {candidate.rank}. {candidate.move}
            </span>
            <span className="text-stone-500 dark:text-stone-300">{formatEval(candidate.cp, candidate.mate)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
