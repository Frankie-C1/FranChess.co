import type { MoveJudgement } from "../types";

export function BoardMoveBadge({ judgement, uci, orientation = "white" }: {
  judgement: MoveJudgement | null;
  uci?: string | null;
  orientation?: "white" | "black";
}) {
  const square = uci?.slice(2, 4);
  if (!judgement || !square || !/^[a-h][1-8]$/.test(square)) return null;

  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const column = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 7 - rank : rank;

  return (
    <span
      className={`board-move-badge judgement-${judgement.kind}`}
      style={{ left: `${(column + 1) * 12.5}%`, top: `${row * 12.5}%` }}
      aria-label={`${judgement.text} auf ${square}`}
    >
      {judgement.symbol}
    </span>
  );
}
