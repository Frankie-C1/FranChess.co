import { materialFromFen } from "../lib/chess/boardUi";

export function CapturedMaterialDisplay({
  fen,
  orientation,
  layout = "stack"
}: {
  fen: string;
  orientation: "white" | "black";
  layout?: "stack" | "side";
}) {
  const material = materialFromFen(fen);
  const top = orientation === "white" ? material.black : material.white;
  const bottom = orientation === "white" ? material.white : material.black;

  if (layout === "side") {
    return (
      <div className="flex h-full min-h-[160px] w-10 flex-col justify-between gap-2 sm:w-12">
        <MaterialRow pieces={top.captured} advantage={top.advantage} align="start" vertical />
        <MaterialRow pieces={bottom.captured} advantage={bottom.advantage} align="end" vertical />
      </div>
    );
  }

  return (
    <div className="grid gap-2 text-sm">
      <MaterialRow pieces={top.captured} advantage={top.advantage} align="start" />
      <MaterialRow pieces={bottom.captured} advantage={bottom.advantage} align="end" />
    </div>
  );
}

function MaterialRow({
  pieces,
  advantage,
  align,
  vertical = false
}: {
  pieces: string[];
  advantage: number;
  align: "start" | "end";
  vertical?: boolean;
}) {
  return (
    <div
      className={`flex min-h-7 gap-1 rounded-md bg-[var(--color-surface-2)] px-2 py-1 ${
        vertical ? "min-h-[44%] flex-col items-center justify-center" : `items-center ${align === "end" ? "justify-end" : "justify-start"}`
      }`}
    >
      <span className={`${vertical ? "whitespace-pre-line text-center" : "min-w-0 truncate"} text-base leading-none text-stone-400 dark:text-stone-500`}>
        {pieces.join(vertical ? "\n" : " ") || "·"}
      </span>
      <span className="text-xs font-semibold text-[var(--color-muted)]">{advantage > 0 ? `+${advantage}` : ""}</span>
    </div>
  );
}
