import type { ReactNode } from "react";

export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="text-sm text-[var(--color-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{value}</div>
      {detail && <div className="mt-2 text-sm text-[var(--color-muted)]">{detail}</div>}
    </div>
  );
}
