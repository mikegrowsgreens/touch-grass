// Types for the shared game engine (lib/vendor/games.js, synced from
// shared/games.js). It attaches itself to window as a side effect.

export interface GameUI {
  title: { textContent: string | null };
  intro: { textContent: string | null };
}

export interface GameCallbacks {
  onWin: () => void;
  onLose: () => void;
}

export interface TouchGrassGamesAPI {
  keys: string[];
  shuffle<T>(arr: readonly T[]): T[];
  start(key: string, arena: HTMLElement, ui: GameUI, opts: GameCallbacks): void;
}

declare global {
  interface Window {
    TouchGrassGames: TouchGrassGamesAPI;
  }
}

export {};
