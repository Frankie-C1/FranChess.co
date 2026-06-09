import type { MoveJudgement } from "../types";

export function MoveJudgementBadge({ judgement }: { judgement: MoveJudgement | null }) {
  if (!judgement) return null;

  return (
    <div className={`rounded-md border p-3 text-sm ${styleFor(judgement.kind)}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-8 min-w-8 place-items-center rounded-md bg-white/70 text-base font-bold text-stone-900 dark:bg-stone-950/50 dark:text-stone-100">
          {judgement.symbol}
        </span>
        <span>
          <span className="block font-semibold">{judgement.text}</span>
          <span className="block text-xs opacity-80">Centipawn Loss: {Math.round(judgement.centipawnLoss)}</span>
        </span>
      </div>
      <p className="mt-2 leading-5">{judgement.comment}</p>
    </div>
  );
}

function styleFor(kind: MoveJudgement["kind"]): string {
  if (kind === "brilliant") return "border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-100";
  if (kind === "good" || kind === "only_move") return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
  if (kind === "interesting") return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100";
  if (kind === "dubious") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";
  return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100";
}
