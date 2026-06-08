import type { ReactNode } from "react";

export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="text-sm text-stone-500 dark:text-stone-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white">{value}</div>
      {detail && <div className="mt-2 text-sm text-stone-500 dark:text-stone-400">{detail}</div>}
    </div>
  );
}
