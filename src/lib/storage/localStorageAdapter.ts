import type { StorageAdapter, StoredGame } from "../../types";

const storageKey = "franchess.games.v1";

export const localStorageAdapter: StorageAdapter = {
  async loadGames() {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StoredGame[];
    } catch {
      return [];
    }
  },
  async saveGames(games) {
    window.localStorage.setItem(storageKey, JSON.stringify(games));
  },
  async clear() {
    window.localStorage.removeItem(storageKey);
  }
};
