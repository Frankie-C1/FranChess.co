import { localStorageAdapter } from "./localStorageAdapter";

// Existing feature code remains local-first. Cloud synchronization is coordinated
// by App so failed network requests can never block imports, analysis or settings.
export const storageAdapter = localStorageAdapter;
