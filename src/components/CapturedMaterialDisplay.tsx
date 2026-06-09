import { materialFromFen } from "../lib/chess/boardUi";

export function CapturedMaterialDisplay({ fen, orientation }: { fen: string; orientation: "white" | "black" }) {
  const material = materialFromFen(fen);
  const top = orientation === "white" ? material.black : material.white;
  const bottom = orientation === "white" ? material.white : material.black;

  return (
    <div className="grid gap-2 text-sm">
      <MaterialRow pieces={top.captured} advantage={top.advantage} align="start" />
      <MaterialRow pieces={bottom.captured} advantage={bottom.advantage} align="end" />
    </div>
  );
}

function MaterialRow({ pieces, advantage, align }: { pieces: string[]; advantage: number; align: "start" | "end" }) {
  return (
    <div className={`flex min-h-7 items-center gap-2 rounded-md bg-[var(--color-surface-2)] px-2 py-1 ${align === "end" ? "justify-end" : "justify-start"}`}>
      <span className="min-w-0 truncate text-lg leading-none text-stone-400 dark:text-stone-500">{pieces.join(" ") || "·"}</span>
      <span className="text-xs font-semibold text-[var(--color-muted)]">{advantage > 0 ? `+${advantage}` : ""}</span>
    </div>
  );
}
