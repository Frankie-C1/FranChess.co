import type { MoveAnalysis } from "../types";

export function EvalGraph({ moves, activePly, onSelect }: { moves: MoveAnalysis[]; activePly: number; onSelect: (ply: number) => void }) {
  const width = 720;
  const height = 150;
  const points = moves.map((move, index) => {
    const cp = Math.max(-600, Math.min(600, move.evalAfter ?? 0));
    const x = moves.length <= 1 ? 0 : (index / (moves.length - 1)) * width;
    const y = height / 2 - (cp / 600) * (height / 2 - 10);
    return `${x},${y}`;
  });

  return (
    <div className="rounded-md border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="Bewertungsgrafik">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" className="text-stone-300 dark:text-stone-700" />
        <polyline fill="none" stroke="#5f8f45" strokeWidth="4" points={points.join(" ")} strokeLinecap="round" strokeLinejoin="round" />
        {moves.map((move, index) => {
          const x = moves.length <= 1 ? 0 : (index / (moves.length - 1)) * width;
          const cp = Math.max(-600, Math.min(600, move.evalAfter ?? 0));
          const y = height / 2 - (cp / 600) * (height / 2 - 10);
          const serious = move.centipawnLoss > 150;
          return (
            <g key={move.id} onClick={() => onSelect(move.ply)} className="cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r={move.ply === activePly ? 7 : serious ? 5 : 3}
                fill={serious ? "#b45309" : "#5f8f45"}
                opacity={move.ply === activePly ? 1 : 0.85}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
