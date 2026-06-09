import type { ReactNode } from "react";
import { Columns3, Moon, Move, Palette, Search, Sparkles, Star } from "lucide-react";
import type { AppSettings, BoardTheme, ColorTheme, EngineElo, LayoutMode, StoredGame } from "../types";

const engineEloOptions: EngineElo[] = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, "max"];

const colorThemes: Array<{ id: ColorTheme; label: string; detail: string; swatch: string }> = [
  { id: "standard", label: "Standard Gruen/Braun", detail: "Ruhige Schach-App-Basis mit natuerlichem Gruen.", swatch: "#6a8f3f" },
  { id: "gold", label: "Schwarz/Gold", detail: "Dunkle Basis, warme goldene Akzente.", swatch: "#d6a934" },
  { id: "purple", label: "Schwarz/Lila", detail: "Dunkle Basis, gedimmte violette Akzente.", swatch: "#7353a1" },
  { id: "wood", label: "Klassisch Holz", detail: "Warme Holz- und Sandtoene.", swatch: "#8b6239" },
  { id: "gray", label: "Minimal Grau", detail: "Reduzierte neutrale Flaechen.", swatch: "#66705f" },
  { id: "blueGray", label: "Blau/Grau", detail: "Kuehl, sachlich und ruhig.", swatch: "#4d7182" },
  { id: "tournamentGreen", label: "Turnier Gruen", detail: "Konzentrierter Gruenton mit heller Oberflaeche.", swatch: "#4f7f36" },
  { id: "nightBrown", label: "Nacht Braun", detail: "Dunkle, warme Brettclub-Stimmung.", swatch: "#7a6047" }
];

const boardThemes: Array<{ id: BoardTheme; label: string; detail: string }> = [
  { id: "auto", label: "Automatisch nach App-Theme", detail: "Waehlt eine passende Brettfarbe zur Palette." },
  { id: "green", label: "Klassisch Gruen", detail: "Helles Gruen, gut lesbar fuer Analyse." },
  { id: "wood", label: "Braun/Holz", detail: "Warme Holzoptik ohne starke Textur." },
  { id: "gray", label: "Grau", detail: "Sehr ruhig fuer lange Analyse-Sessions." },
  { id: "blueGray", label: "Blau/Grau", detail: "Kuehle, klare Brettkontraste." },
  { id: "dark", label: "Dunkel", detail: "Gedimmtes Brett fuer Dark Mode." }
];

const layoutModes: Array<{ id: LayoutMode; label: string; detail: string }> = [
  { id: "auto", label: "Automatisch", detail: "Handy unten, Desktop oben." },
  { id: "top", label: "Web/Layout oben", detail: "Top-Navigation auf allen Geraeten." },
  { id: "bottom", label: "Mobile Layout unten", detail: "Bottom-Bar auch auf Desktop erzwingen." }
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
          description="Dunkles Farbschema dauerhaft verwenden. Neue Nutzer starten standardmaessig dunkel."
          checked={settings.darkMode}
          onChange={(checked) => update({ darkMode: checked })}
        />
      </SettingsSection>

      <SettingsSection icon={<Palette size={19} />} title="Farbtheme">
        <OptionGrid>
          {colorThemes.map((theme) => (
            <OptionButton
              key={theme.id}
              active={settings.colorTheme === theme.id}
              onClick={() => update({ colorTheme: theme.id })}
              swatch={theme.swatch}
              label={theme.label}
              detail={theme.detail}
            />
          ))}
        </OptionGrid>
      </SettingsSection>

      <SettingsSection icon={<Move size={19} />} title="Brettdesign">
        <OptionGrid>
          {boardThemes.map((theme) => (
            <OptionButton
              key={theme.id}
              active={settings.boardTheme === theme.id}
              onClick={() => update({ boardTheme: theme.id })}
              label={theme.label}
              detail={theme.detail}
            />
          ))}
        </OptionGrid>
        <div className="mt-4">
          <ToggleRow
            label="Verfuegbare Zuege anzeigen"
            description="Legale Zielfelder nach Auswahl einer Figur dezent markieren."
            checked={settings.showLegalMoves}
            onChange={(checked) => update({ showLegalMoves: checked })}
          />
        </div>
      </SettingsSection>

      <SettingsSection icon={<Columns3 size={19} />} title="Layout-Modus">
        <OptionGrid>
          {layoutModes.map((mode) => (
            <OptionButton
              key={mode.id}
              active={settings.layoutMode === mode.id}
              onClick={() => update({ layoutMode: mode.id })}
              label={mode.label}
              detail={mode.detail}
            />
          ))}
        </OptionGrid>
      </SettingsSection>

      <SettingsSection icon={<Sparkles size={19} />} title="Coach">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Engine-Elo</span>
          <select
            value={settings.engineElo}
            onChange={(event) => update({ engineElo: parseEngineElo(event.target.value) })}
            className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3"
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
            description="Nur fuer Analyse- und Variantenmodus; echte Coach-Zuege bleiben geschuetzt."
            checked={settings.allowOpponentMoves}
            onChange={(checked) => update({ allowOpponentMoves: checked })}
          />
        </div>
      </SettingsSection>

      <SettingsSection icon={<Search size={19} />} title="Analyse">
        <p className="text-sm leading-6 text-[var(--color-muted)]">
          Zugvorschlaege laufen nur auf Buttondruck. Vor- und Zuruecknavigation nutzt gespeicherte Analysewerte und startet keine neue Engineberechnung.
        </p>
      </SettingsSection>

      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-accent)]">
            <Star size={19} fill="currentColor" />
          </span>
          <h1 className="text-lg font-semibold">Favoriten</h1>
        </div>
        {favorites.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Noch keine favorisierten Partien.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {favorites.map((game) => (
              <article key={game.id} className="rounded-md border border-[var(--color-border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => onOpenGame(game.id)}>
                    <span className="block font-medium">
                      {game.metadata.white} gegen {game.metadata.black}
                    </span>
                    <span className="mt-1 block text-sm text-[var(--color-muted)]">
                      {game.metadata.result} - {game.metadata.date || "ohne Datum"} - {inferColor(game)}
                    </span>
                    <span className="mt-1 block truncate text-sm text-[var(--color-muted)]">{game.metadata.opening || "Eroeffnung nicht im PGN"}</span>
                  </button>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-accent)]"
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
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-text)]">{icon}</span>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {children}
    </section>
  );
}

function OptionGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-2">{children}</div>;
}

function OptionButton({
  active,
  onClick,
  label,
  detail,
  swatch
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  detail: string;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border p-3 text-left transition ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-surface-2)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]"
      }`}
    >
      <span className="flex items-center gap-3">
        {swatch && <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: swatch }} />}
        <span>
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-[var(--color-muted)]">{detail}</span>
        </span>
      </span>
    </button>
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
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md bg-[var(--color-surface-2)] p-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-[var(--color-muted)]">{description}</span>
      </span>
      <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function parseEngineElo(value: string): EngineElo {
  return value === "max" ? "max" : (Number(value) as EngineElo);
}

function inferColor(game: StoredGame): string {
  if (game.source?.importedBy && game.metadata.white.toLowerCase() === game.source.importedBy.toLowerCase()) return "Weiss";
  if (game.source?.importedBy && game.metadata.black.toLowerCase() === game.source.importedBy.toLowerCase()) return "Schwarz";
  return "Farbe unbekannt";
}
