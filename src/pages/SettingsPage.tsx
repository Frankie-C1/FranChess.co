import { useState, type ReactNode } from "react";
import { Columns3, Database, LogOut, Moon, Move, Palette, Puzzle, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { filterGamesByPlayer, sortGamesByDate, type GameSortOrder } from "../lib/chess/gameList";
import type { AppSettings, BoardTheme, ColorTheme, EngineElo, LayoutMode, StoredGame } from "../types";

const engineEloOptions: EngineElo[] = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, "max"];

const colorThemes: Array<{ id: ColorTheme; label: string; detail: string; swatch: string }> = [
  { id: "standard", label: "Standard Grün/Braun", detail: "Ruhige Schach-App-Basis mit natürlichem Grün.", swatch: "#6a8f3f" },
  { id: "gold", label: "Schwarz/Gold", detail: "Dunkle Basis, warme goldene Akzente.", swatch: "#d6a934" },
  { id: "purple", label: "Schwarz/Lila", detail: "Dunkle Basis, gedimmte violette Akzente.", swatch: "#7353a1" },
  { id: "wood", label: "Klassisch Holz", detail: "Warme Holz- und Sandtöne.", swatch: "#8b6239" },
  { id: "gray", label: "Minimal Grau", detail: "Reduzierte neutrale Flächen.", swatch: "#66705f" },
  { id: "blueGray", label: "Blau/Grau", detail: "Kühl, sachlich und ruhig.", swatch: "#4d7182" },
  { id: "tournamentGreen", label: "Turnier Grün", detail: "Konzentrierter Grünton mit heller Oberfläche.", swatch: "#4f7f36" },
  { id: "nightBrown", label: "Nacht Braun", detail: "Dunkle, warme Brettclub-Stimmung.", swatch: "#7a6047" }
];

const boardThemes: Array<{ id: BoardTheme; label: string; detail: string }> = [
  { id: "auto", label: "Automatisch nach App-Theme", detail: "Wählt eine passende Brettfarbe zur Palette." },
  { id: "green", label: "Klassisch Grün", detail: "Helles Grün, gut lesbar für Analyse." },
  { id: "wood", label: "Braun/Holz", detail: "Warme Holzoptik ohne starke Textur." },
  { id: "gray", label: "Grau", detail: "Sehr ruhig für lange Analyse-Sessions." },
  { id: "blueGray", label: "Blau/Grau", detail: "Kühle, klare Brettkontraste." },
  { id: "dark", label: "Dunkel", detail: "Gedimmtes Brett für Dark Mode." }
];

const layoutModes: Array<{ id: LayoutMode; label: string; detail: string }> = [
  { id: "auto", label: "Automatisch", detail: "Handy unten, Desktop oben." },
  { id: "top", label: "Web/Layout oben", detail: "Top-Navigation auf allen Geräten." },
  { id: "bottom", label: "Mobile Layout unten", detail: "Bottom-Bar auch auf Desktop erzwingen." }
];

export function SettingsPage({
  settings,
  onSettingsChange,
  games,
  onGamesChange,
  onOpenGame,
  onToggleFavorite,
  onLogout
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  games: StoredGame[];
  onGamesChange: (games: StoredGame[]) => Promise<void>;
  onOpenGame: (id: string) => void;
  onToggleFavorite: (id: string) => Promise<void>;
  onLogout: () => void;
}) {
  const favorites = games.filter((game) => game.favorite);
  const [playerToDelete, setPlayerToDelete] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [favoriteSearch, setFavoriteSearch] = useState("");
  const [favoriteSortOrder, setFavoriteSortOrder] = useState<GameSortOrder>("desc");
  const visibleFavorites = filterGamesByPlayer(sortGamesByDate(favorites, favoriteSortOrder), favoriteSearch);
  const analyzedCount = games.filter((game) => game.analysis.length > 0).length;

  function update(next: Partial<AppSettings>) {
    onSettingsChange({ ...settings, ...next });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SettingsSection icon={<Moon size={19} />} title="Darstellung">
        <ToggleRow
          label="Dark Mode"
          description="Dunkles Farbschema dauerhaft verwenden. Neue Nutzer starten standardmäßig dunkel."
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
            label="Verfügbare Züge anzeigen"
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
            description="Nur für Analyse- und Variantenmodus; echte Coach-Züge bleiben geschützt."
            checked={settings.allowOpponentMoves}
            onChange={(checked) => update({ allowOpponentMoves: checked })}
          />
        </div>
      </SettingsSection>

      <SettingsSection icon={<Search size={19} />} title="Analyse">
        <p className="text-sm leading-6 text-[var(--color-muted)]">
          Zugvorschläge laufen nur auf Buttondruck. Vor- und Zurücknavigation nutzt gespeicherte Analysewerte und startet keine neue Engineberechnung.
        </p>
      </SettingsSection>

      <SettingsSection icon={<Puzzle size={19} />} title="Training">
        <ToggleRow
          label="Bereits gespielte Puzzles erneut anzeigen"
          description="Wenn aus, werden lokal gemerkte Puzzles standardmäßig übersprungen."
          checked={settings.allowPlayedPuzzles}
          onChange={(checked) => update({ allowPlayedPuzzles: checked })}
        />
      </SettingsSection>

      <SettingsSection icon={<Database size={19} />} title="Daten verwalten">
        <div className="grid gap-3 text-sm">
          <div className="grid gap-2 rounded-md bg-[var(--color-surface-2)] p-3">
            <Row label="Importierte Partien" value={games.length} />
            <Row label="Analysierte Partien" value={analyzedCount} />
            <Row label="Speicher grob" value={formatStorageSize(games)} />
          </div>
          <DangerButton
            label="Alle importierten Partien löschen"
            onClick={() => void deleteGames(games, "alle importierten Partien")}
          />
          <DangerButton
            label="Partien älter als 1 Monat löschen"
            onClick={() => void deleteGames(games.filter((game) => isOlderThanOneMonth(game.metadata.date)), "Partien älter als 1 Monat")}
          />
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="delete-player">Spielername</label>
            <input
              id="delete-player"
              value={playerToDelete}
              onChange={(event) => setPlayerToDelete(event.target.value)}
              className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3"
              placeholder="z. B. Francesco"
            />
            <DangerButton
              label="Partien dieses Spielers löschen"
              onClick={() => {
                const needle = playerToDelete.trim().toLowerCase();
                const matches = needle
                  ? games.filter((game) => game.metadata.white.toLowerCase() === needle || game.metadata.black.toLowerCase() === needle)
                  : [];
                void deleteGames(matches, `Partien von ${playerToDelete.trim() || "diesem Spieler"}`);
              }}
            />
          </div>
          {dataMessage && <p className="rounded-md bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]">{dataMessage}</p>}
        </div>
      </SettingsSection>

      <SettingsSection icon={<LogOut size={19} />} title="Benutzerkonto">
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <LogOut size={17} />
          Abmelden
        </button>
      </SettingsSection>

      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-accent)]">
            <Star size={19} fill="currentColor" />
          </span>
          <h1 className="text-lg font-semibold">Favoriten</h1>
        </div>
        {favorites.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={favoriteSearch}
              onChange={(event) => setFavoriteSearch(event.target.value)}
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              placeholder="Spieler suchen"
            />
            <button
              type="button"
              onClick={() => setFavoriteSortOrder((value) => (value === "desc" ? "asc" : "desc"))}
              className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-surface-2)]"
            >
              Datum {favoriteSortOrder === "desc" ? "absteigend" : "aufsteigend"}
            </button>
          </div>
        )}
        {favorites.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Noch keine favorisierten Partien.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleFavorites.map((game) => (
              <article key={game.id} className="rounded-md border border-[var(--color-border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => onOpenGame(game.id)}>
                    <span className="block font-medium">
                      {game.metadata.white} gegen {game.metadata.black}
                    </span>
                    <span className="mt-1 block text-sm text-[var(--color-muted)]">
                      {game.metadata.result} - {game.metadata.date || "ohne Datum"} - {inferColor(game)}
                    </span>
                    <span className="mt-1 block truncate text-sm text-[var(--color-muted)]">{game.metadata.opening || "Eröffnung nicht im PGN"}</span>
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

  async function deleteGames(matches: StoredGame[], label: string) {
    if (matches.length === 0) {
      setDataMessage("Keine passenden Partien gefunden.");
      return;
    }
    const ok = window.confirm(`${matches.length} ${label} wirklich löschen? Einstellungen und Themes bleiben erhalten.`);
    if (!ok) return;
    const ids = new Set(matches.map((game) => game.id));
    await onGamesChange(games.filter((game) => !ids.has(game.id)));
    setDataMessage(`${matches.length} Partien gelöscht.`);
  }
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DangerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      <Trash2 size={16} />
      {label}
    </button>
  );
}

function formatStorageSize(games: StoredGame[]): string {
  const bytes = new Blob([JSON.stringify(games)]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isOlderThanOneMonth(dateValue: string): boolean {
  if (!dateValue) return false;
  const normalized = dateValue.replace(/\./g, "-");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);
  return date < cutoff;
}

function parseEngineElo(value: string): EngineElo {
  return value === "max" ? "max" : (Number(value) as EngineElo);
}

function inferColor(game: StoredGame): string {
  if (game.source?.importedBy && game.metadata.white.toLowerCase() === game.source.importedBy.toLowerCase()) return "Weiß";
  if (game.source?.importedBy && game.metadata.black.toLowerCase() === game.source.importedBy.toLowerCase()) return "Schwarz";
  return "Farbe unbekannt";
}
