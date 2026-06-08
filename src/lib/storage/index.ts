import { localStorageAdapter } from "./localStorageAdapter";
import { supabase } from "./supabase";
import type { StorageAdapter, StoredGame } from "../../types";

const localFirstAdapter: StorageAdapter = {
  async loadGames() {
    return localStorageAdapter.loadGames();
  },
  async saveGames(games: StoredGame[]) {
    await localStorageAdapter.saveGames(games);

    if (supabase) {
      await supabase.from("games").upsert(
        games.map((game) => ({
          id: game.id,
          pgn: game.pgn,
          metadata: game.metadata,
          imported_at: game.importedAt
        }))
      );
    }
  },
  async clear() {
    await localStorageAdapter.clear();
  }
};

export const storageAdapter = localFirstAdapter;
