import { describe, expect, it } from "vitest";
import {
  GAME_KEYS,
  afterLoss,
  afterWin,
  currentGame,
  newGauntlet,
  type Shuffle,
} from "../gauntlet";

const inOrder: Shuffle = (a) => a.slice() as never;
const reversed: Shuffle = (a) => a.slice().reverse() as never;

describe("newGauntlet", () => {
  it("orders all three games exactly once", () => {
    const g = newGauntlet(false);
    expect([...g.order].sort()).toEqual([...GAME_KEYS].sort());
    expect(g.step).toBe(0);
  });

  it("keeps the strict flag", () => {
    expect(newGauntlet(true).strict).toBe(true);
    expect(newGauntlet(false).strict).toBe(false);
  });
});

describe("afterWin", () => {
  it("advances to the next game mid-run", () => {
    const g = newGauntlet(false, inOrder);
    const r = afterWin(g);
    expect(r.done).toBe(false);
    expect(r.state.step).toBe(1);
    expect(currentGame(r.state)).toBe(GAME_KEYS[1]);
  });

  it("is done after the third win", () => {
    let g = newGauntlet(true, inOrder);
    g = afterWin(g).state;
    g = afterWin(g).state;
    expect(afterWin(g).done).toBe(true);
  });
});

describe("afterLoss", () => {
  it("lenient: same game, progress kept", () => {
    let g = newGauntlet(false, inOrder);
    g = afterWin(g).state; // at step 1
    const after = afterLoss(g, reversed);
    expect(after.step).toBe(1);
    expect(after.order).toEqual(g.order);
  });

  it("strict: back to step 0 in a fresh order", () => {
    let g = newGauntlet(true, inOrder);
    g = afterWin(g).state;
    g = afterWin(g).state; // at step 2 — one win from the pass
    const after = afterLoss(g, reversed);
    expect(after.step).toBe(0);
    expect(after.order).toEqual(reversed(GAME_KEYS));
    expect(after.strict).toBe(true);
  });
});
