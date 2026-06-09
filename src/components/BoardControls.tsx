import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function BoardControls({ current, max, onChange }: { current: number; max: number; onChange: (next: number) => void }) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      <ControlButton label="Zum Anfang" disabled={current <= 0} onClick={() => onChange(0)}>
        <ChevronsLeft size={18} />
      </ControlButton>
      <ControlButton label="Einen Zug zurück" disabled={current <= 0} onClick={() => onChange(Math.max(0, current - 1))}>
        <ChevronLeft size={18} />
      </ControlButton>
      <ControlButton label="Einen Zug vor" disabled={current >= max} onClick={() => onChange(Math.min(max, current + 1))}>
        <ChevronRight size={18} />
      </ControlButton>
      <ControlButton label="Zum Ende" disabled={current >= max} onClick={() => onChange(max)}>
        <ChevronsRight size={18} />
      </ControlButton>
    </div>
  );
}

function ControlButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
