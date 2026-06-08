import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { CoachView } from "../types";
import { BrandLogo } from "./BrandLogo";

interface LayoutProps {
  nav: Array<{ id: CoachView; label: string; icon: LucideIcon }>;
  view: CoachView;
  onNavigate: (view: CoachView) => void;
  utility: ReactNode;
  children: ReactNode;
}

export function Layout({ nav, view, onNavigate, utility, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f1ea] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f4f1ea]/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => onNavigate("home")} className="flex min-w-0 items-center gap-3">
            <BrandLogo size="sm" />
            <span className="min-w-0">
              <span className="block text-left text-lg font-semibold leading-5">FranChess.co</span>
              <span className="block text-left text-xs text-stone-500 dark:text-stone-400">Analyse. Training. Fortschritt.</span>
            </span>
          </button>
          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm transition ${
                    active
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                      : "text-stone-600 hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          {utility}
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-4 gap-1 px-4 pb-3 sm:px-6 lg:hidden">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`inline-flex h-9 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-md px-2 text-xs ${
                  active
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                    : "bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300"
                }`}
              >
                <Icon size={15} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
