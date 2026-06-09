import { useState, type ReactNode } from "react";
import { Crown, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CoachView } from "../types";
import { BrandLogo } from "./BrandLogo";

interface LayoutProps {
  nav: Array<{ id: CoachView; label: string; icon: LucideIcon }>;
  view: CoachView;
  onNavigate: (view: CoachView) => void;
  utility?: ReactNode;
  children: ReactNode;
}

export function Layout({ nav, view, onNavigate, utility, children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(nextView: CoachView) {
    onNavigate(nextView);
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => navigate("home")} className="flex min-w-0 items-center gap-3">
            <BrandLogo size="sm" />
            <span className="min-w-0">
              <span className="block text-left text-lg font-semibold leading-5">FranChess.co</span>
              <span className="block text-left text-xs text-[var(--color-muted)]">Analyse. Training. Fortschritt.</span>
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
                  onClick={() => navigate(item.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm transition ${
                    active
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
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
        <div className="mx-auto hidden max-w-7xl grid-cols-4 gap-1 px-4 pb-3 sm:px-6 md:grid lg:hidden">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                  type="button"
                  key={item.id}
                onClick={() => navigate(item.id)}
                className={`inline-flex h-9 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-md px-2 text-xs ${
                  active
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                    : "bg-[var(--color-surface)] text-[var(--color-muted)]"
                }`}
              >
                <Icon size={15} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 md:pb-6 lg:py-8">{children}</main>
      {menuOpen && (
        <button
          type="button"
          aria-label="Menü schließen"
          className="fixed inset-0 z-30 bg-stone-950/20 backdrop-blur-[1px] md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div
        className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-40 origin-bottom rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl transition md:hidden ${
          menuOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => navigate(item.id)}
                className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-8px_28px_rgba(0,0,0,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          <MobileNavButton nav={nav} id="viewer" view={view} onNavigate={navigate} />
          <MobileNavButton nav={nav} id="dashboard" view={view} onNavigate={navigate} label="Analyse" />
          <button
            type="button"
            onClick={() => navigate("play")}
            className={`relative -mt-7 inline-flex h-16 flex-col items-center justify-center rounded-full border-4 border-[var(--color-surface)] px-4 text-xs font-semibold shadow-lg transition ${
              view === "play"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                : "bg-[var(--color-accent-2)] text-[var(--color-accent-contrast)]"
            }`}
          >
            <Crown size={22} />
            Coach
          </button>
          <MobileNavButton nav={nav} id="training" view={view} onNavigate={navigate} />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`inline-flex h-14 flex-col items-center justify-center gap-1 rounded-md text-xs transition ${
              menuOpen ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"
            }`}
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
            Menü
          </button>
        </div>
      </nav>
    </div>
  );
}

function MobileNavButton({
  nav,
  id,
  view,
  onNavigate,
  label
}: {
  nav: Array<{ id: CoachView; label: string; icon: LucideIcon }>;
  id: CoachView;
  view: CoachView;
  onNavigate: (view: CoachView) => void;
  label?: string;
}) {
  const item = nav.find((entry) => entry.id === id);
  if (!item) return null;
  const Icon = item.icon;
  const active = view === id;
  return (
    <button
      type="button"
      onClick={() => onNavigate(id)}
      className={`inline-flex h-14 flex-col items-center justify-center gap-1 rounded-md text-xs transition ${
        active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"
      }`}
    >
      <Icon size={20} />
      {label ?? item.label}
    </button>
  );
}
