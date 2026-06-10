import { formatEval } from "../lib/chess/boardUi";

export function EvaluationBar({ cp, mate }: { cp: number | null; mate: number | null }) {
  const whitePercent = evalToWhitePercent(cp, mate);

  return (
    <div className="relative flex h-full min-h-full w-8 flex-col overflow-hidden rounded-md border border-stone-200 bg-stone-950 text-xs font-semibold shadow-sm dark:border-stone-800 sm:w-9">
      <div className="grid place-items-center bg-white text-stone-900" style={{ flexBasis: `${whitePercent}%` }}>
        <span className="hidden sm:block">{whitePercent >= 52 ? formatEval(cp, mate) : ""}</span>
      </div>
      <div className="grid place-items-center bg-stone-950 text-white" style={{ flexBasis: `${100 - whitePercent}%` }}>
        <span className="hidden sm:block">{whitePercent < 52 ? formatEval(cp, mate) : ""}</span>
      </div>
      <span className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded bg-white/80 px-1 text-stone-900">
        {formatEval(cp, mate)}
      </span>
    </div>
  );
}

function evalToWhitePercent(cp: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 92 : 8;
  if (cp === null) return 50;
  const clamped = Math.max(-800, Math.min(800, cp));
  return Math.round(50 + (clamped / 800) * 42);
}
