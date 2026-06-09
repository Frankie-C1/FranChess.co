import type { AppSettings } from "../../types";

export const settingsKey = "franchess.settings.v1";

export const defaultSettings: AppSettings = {
  darkMode: true,
  showLegalMoves: true,
  allowOpponentMoves: false,
  engineElo: 1200,
  coachSettingsCollapsed: false,
  colorTheme: "standard",
  boardTheme: "auto",
  layoutMode: "auto"
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;

  const raw = window.localStorage.getItem(settingsKey);
  if (!raw) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  window.localStorage.setItem(settingsKey, JSON.stringify(settings));
}
