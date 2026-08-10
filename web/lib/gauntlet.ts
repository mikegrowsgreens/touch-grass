// The ranger-station gauntlet, as a pure state machine. Beat ALL THREE games
// in a row. Lenient run (day pass default): a loss just retries that game.
// Strict run (work permit default): any loss resets to game one in a fresh
// order. Which mode applies comes from ParkConfig.strict, so both pass kinds
// can be flipped in /settings.

export type GameKey = "typing" | "memory" | "reaction";

export const GAME_KEYS: readonly GameKey[] = ["typing", "memory", "reaction"];

export const GAME_NAMES: Record<GameKey, string> = {
  typing: "Typing gauntlet",
  memory: "Memory match",
  reaction: "Duck reflex",
};

export const GAME_HOWTO: Record<GameKey, string> = {
  typing: "Type the posted sentence perfectly. One wrong character resets it.",
  memory: "Find all 8 matching pairs in 20 tries.",
  reaction: "A duck pops up somewhere in the field. Click it within 1.25 seconds. Five ducks.",
};

export interface GauntletState {
  order: GameKey[];
  step: number; // 0..2 while running
  strict: boolean;
}

export type Shuffle = <T>(arr: readonly T[]) => T[];

export const defaultShuffle: Shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function newGauntlet(strict: boolean, shuffle: Shuffle = defaultShuffle): GauntletState {
  return { order: shuffle(GAME_KEYS), step: 0, strict };
}

export function currentGame(state: GauntletState): GameKey {
  return state.order[state.step];
}

/** After a game win: either the next state, or done = pass earned. */
export function afterWin(state: GauntletState): { state: GauntletState; done: boolean } {
  const step = state.step + 1;
  if (step >= state.order.length) return { state, done: true };
  return { state: { ...state, step }, done: false };
}

/** After a loss: strict restarts the whole run in a fresh order, lenient retries the same game. */
export function afterLoss(state: GauntletState, shuffle: Shuffle = defaultShuffle): GauntletState {
  if (state.strict) return { order: shuffle(GAME_KEYS), step: 0, strict: true };
  return state;
}
