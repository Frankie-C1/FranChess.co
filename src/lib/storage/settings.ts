import type { AppSettings } from "../../types";

export const settingsKey = "franchess.settings.v1";

export const defaultSettings: AppSettings = {
  darkMode: false,
  showLegalMoves: true,
  allowOpponentMoves: false,
  engineElo: 1200,
  coachSettingsCollapsed: false,
  colorTheme: "standard"
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;

  const raw = window.localStorage.getItem(settingsKey);
  if (!raw) {
    return {
      ...defaultSettings,
      darkMode: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
    };
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
