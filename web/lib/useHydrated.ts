"use client";

// false during SSR and the hydration render, true right after — the
// lint-clean way to defer localStorage reads without setState-in-effect.

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
