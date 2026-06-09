import type { StorageAdapter, StoredGame } from "../../types";

const storageKey = "franchess.games.v1";

export const localStorageAdapter: StorageAdapter = {
  async loadGames() {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as StoredGame[];
      return parsed.map((game) => ({ ...game, favorite: Boolean(game.favorite), analysis: game.analysis ?? [] }));
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
