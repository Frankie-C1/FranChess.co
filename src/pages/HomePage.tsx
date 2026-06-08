import { BarChart3, Download, Play, Upload } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { BrandLogo } from "../components/BrandLogo";
import type { CoachView } from "../types";

export function HomePage({ onNavigate, gameCount }: { onNavigate: (view: CoachView) => void; gameCount: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-md border border-stone-200 bg-white p-6 shadow-calm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <BrandLogo size="lg" />
        <p className="mt-5 text-sm font-medium uppercase tracking-wide text-[#5f8f45]">Open-Source Schachtrainer</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-stone-950 dark:text-white sm:text-5xl">
          FranChess.co
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600 dark:text-stone-300">
          Trainiere mit Stockfish, analysiere deine Fehler und verbessere dein Schach.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <ActionButton onClick={() => onNavigate("upload")} icon={<Upload size={18} />}>
            Partie hochladen
          </ActionButton>
          <ActionButton onClick={() => onNavigate("play")} variant="secondary" icon={<Play size={18} />}>
            Gegen Coach spielen
          </ActionButton>
          <ActionButton onClick={() => onNavigate("dashboard")} variant="quiet" icon={<BarChart3 size={18} />}>
            Analyse ansehen
          </ActionButton>
          <ActionButton onClick={() => onNavigate("export")} variant="quiet" icon={<Download size={18} />}>
            Export für Coach
          </ActionButton>
        </div>
      </section>

      <aside className="grid gap-4">
        <div className="rounded-md border border-stone-200 bg-[#ede8dc] p-5 dark:border-stone-800 dark:bg-stone-900">
          <div className="text-sm text-stone-500 dark:text-stone-400">Lokale Bibliothek</div>
          <div className="mt-2 text-3xl font-semibold">{gameCount}</div>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Partien sind im Browser gespeichert. Supabase ist optional vorbereitet.</p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold">V1-Fokus</h2>
          <div className="mt-4 grid gap-3 text-sm text-stone-600 dark:text-stone-300">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2 dark:border-stone-800">
              <span>PGN-Import</span>
              <span className="font-medium text-[#5f8f45]">lokal</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-2 dark:border-stone-800">
              <span>Stockfish</span>
              <span className="font-medium text-[#5f8f45]">Worker-ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Coach-Export</span>
              <span className="font-medium text-[#5f8f45]">ZIP</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
