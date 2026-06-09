import { materialFromFen } from "../lib/chess/boardUi";

export function CapturedMaterialDisplay({ fen, orientation }: { fen: string; orientation: "white" | "black" }) {
  const material = materialFromFen(fen);
  const top = orientation === "white" ? material.black : material.white;
  const bottom = orientation === "white" ? material.white : material.black;

  return (
    <div className="grid gap-2 text-sm">
      <MaterialRow label={orientation === "white" ? "Schwarz" : "Weiß"} pieces={top.captured} advantage={top.advantage} />
      <MaterialRow label={orientation === "white" ? "Weiß" : "Schwarz"} pieces={bottom.captured} advantage={bottom.advantage} />
    </div>
  );
}

function MaterialRow({ label, pieces, advantage }: { label: string; pieces: string[]; advantage: number }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2 rounded-md bg-stone-100 px-2 py-1 dark:bg-stone-800">
      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      <span className="min-w-0 flex-1 truncate text-lg leading-none text-stone-400 dark:text-stone-500">{pieces.join(" ") || "·"}</span>
      <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{advantage > 0 ? `+${advantage}` : ""}</span>
    </div>
  );
}
