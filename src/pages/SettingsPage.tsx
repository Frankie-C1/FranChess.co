import type { ReactNode } from "react";
import { Moon, Move, Search, Sparkles } from "lucide-react";
import type { AppSettings } from "../types";

export function SettingsPage({
  settings,
  onSettingsChange
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
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

      <SettingsSection icon={<Move size={19} />} title="Brett">
        <ToggleRow
          label="Verfügbare Züge anzeigen"
          description="Legale Zielfelder nach Auswahl einer Figur dezent markieren."
          checked={settings.showLegalMoves}
          onChange={(checked) => update({ showLegalMoves: checked })}
        />
      </SettingsSection>

      <SettingsSection icon={<Sparkles size={19} />} title="Coach">
        <ToggleRow
          label="Coach-/Gegnerfiguren bewegen erlauben"
          description="Nur für Analyse- und Variantenmodus; echte Coach-Züge bleiben geschützt."
          checked={settings.allowOpponentMoves}
          onChange={(checked) => update({ allowOpponentMoves: checked })}
        />
      </SettingsSection>

      <SettingsSection icon={<Search size={19} />} title="Analyse">
        <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
          Analyseoptionen werden hier gesammelt, sobald Tiefe, Pfeile und Trainingsspeicher getrennt einstellbar werden.
        </p>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
          {icon}
        </span>
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
      <input
        type="checkbox"
        className="h-5 w-5 accent-[#5f8f45]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
