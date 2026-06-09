import type { ReactNode } from "react";
import { Moon, Move, Palette, Search, Sparkles, Star } from "lucide-react";
import type { AppSettings, ColorTheme, EngineElo, StoredGame } from "../types";

const engineEloOptions: EngineElo[] = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, "max"];
const colorThemes: Array<{ id: ColorTheme; label: string; detail: string }> = [
  { id: "standard", label: "Standard", detail: "Bestehendes FranChess-Farbschema." },
  { id: "gold", label: "Schwarz/Gold", detail: "Dunkle Basis und goldene Akzente." },
  { id: "purple", label: "Schwarz/Lila", detail: "Dunkle Basis und lila Akzente." }
];

export function SettingsPage({
  settings,
  onSettingsChange,
  games,
  onOpenGame,
  onToggleFavorite
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  games: StoredGame[];
  onOpenGame: (id: string) => void;
  onToggleFavorite: (id: string) => Promise<void>;
}) {
  const favorites = games.filter((game) => game.favorite);

  function update(next: Partial<AppSettings>) {
    onSettingsChange({ ...settings, ...next });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SettingsSection icon={<Moon size={19} />} title="Darstellung">
        <ToggleRow
          label="Dark Mode"
          description="Dunkles Farbschema dauerhaft verwenden."
          checked={settings.darkMode}
          onChange={(checked) => update({ darkMode: checked })}
        />
      </SettingsSection>

      <SettingsSection icon={<Palette size={19} />} title="Farbtheme">
        <div className="grid gap-2">
          {colorThemes.map((theme) => (
            <button
              type="button"
              key={theme.id}
              onClick={() => update({ colorTheme: theme.id })}
              className={`rounded-md border p-3 text-left transition ${
                settings.colorTheme === theme.id
                  ? "border-[var(--color-accent)] bg-[var(--color-surface-2)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`h-5 w-5 rounded-full ${theme.id === "gold" ? "bg-[#d6a934]" : theme.id === "purple" ? "bg-[#8b5cf6]" : "bg-[#5f8f45]"}`} />
                <span>
                  <span className="block text-sm font-medium">{theme.label}</span>
                  <span className="block text-xs text-[var(--color-muted)]">{theme.detail}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={<Move size={19} />} title="Brett">
        <ToggleRow
          label="Verfügbare Züge anzeigen"
          description="Legale Zielfelder nach Auswahl einer Figur dezent markieren."
          checked={settings.showLegalMoves}
          onChange={(checked) => update({ showLegalMoves: checked })}
        />
      </SettingsSection>

      <SettingsSection icon={<Sparkles size={19} />} title="Coach">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Engine-Elo</span>
          <select
            value={settings.engineElo}
            onChange={(event) => update({ engineElo: parseEngineElo(event.target.value) })}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 dark:border-stone-700 dark:bg-stone-950"
          >
            {engineEloOptions.map((elo) => (
              <option key={elo} value={elo}>
                {elo === "max" ? "Maximal" : elo}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3">
          <ToggleRow
            label="Coach-/Gegnerfiguren bewegen erlauben"
            description="Nur für Analyse- und Variantenmodus; echte Coach-Züge bleiben geschützt."
            checked={settings.allowOpponentMoves}
            onChange={(checked) => update({ allowOpponentMoves: checked })}
          />
        </div>
      </SettingsSection>

      <SettingsSection icon={<Search size={19} />} title="Analyse">
        <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
          Zugvorschläge laufen nur auf Buttondruck. Vor-/Zurücknavigation nutzt gespeicherte Analysewerte und startet keine neue Engineberechnung.
        </p>
      </SettingsSection>

      <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-stone-100 text-[#b88700] dark:bg-stone-800">
            <Star size={19} fill="currentColor" />
          </span>
          <h1 className="text-lg font-semibold">Favoriten</h1>
        </div>
        {favorites.length === 0 ? (
          <p className="text-sm text-stone-500">Noch keine favorisierten Partien.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {favorites.map((game) => (
              <article key={game.id} className="rounded-md border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => onOpenGame(game.id)}>
                    <span className="block font-medium">
                      {game.metadata.white} gegen {game.metadata.black}
                    </span>
                    <span className="mt-1 block text-sm text-stone-500">
                      {game.metadata.result} · {game.metadata.date || "ohne Datum"} · {inferColor(game)}
                    </span>
                    <span className="mt-1 block truncate text-sm text-stone-500">{game.metadata.opening || "Eröffnung nicht im PGN"}</span>
                  </button>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-md bg-[#fff7df] text-[#b88700]"
                    onClick={() => void onToggleFavorite(game.id)}
                    aria-label="Favorit entfernen"
                    title="Favorit entfernen"
                  >
                    <Star size={18} fill="currentColor" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200">{icon}</span>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md bg-stone-50 p-4 dark:bg-stone-950">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-stone-500 dark:text-stone-400">{description}</span>
      </span>
      <input type="checkbox" className="h-5 w-5 accent-[#5f8f45]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function parseEngineElo(value: string): EngineElo {
  return value === "max" ? "max" : (Number(value) as EngineElo);
}

function inferColor(game: StoredGame): string {
  if (game.source?.importedBy && game.metadata.white.toLowerCase() === game.source.importedBy.toLowerCase()) return "Weiß";
  if (game.source?.importedBy && game.metadata.black.toLowerCase() === game.source.importedBy.toLowerCase()) return "Schwarz";
  return "Farbe unbekannt";
}
