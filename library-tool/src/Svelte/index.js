/**
 * Svelte adapter for Tradux.
 *
 * Exposes writable stores ($t, $currentLanguage, $isReady) that update
 * automatically when the language changes anywhere in the app.
 * Two ways to use:
 *   - `initSvelteTradux()` in your root +layout.svelte
 *   - `useTradux()` in any component (auto-inits if needed)
 */

import { writable, get } from "svelte/store";
import {
  initTradux,
  setLanguage as coreSetLanguage,
  getAvailableLanguages,
  onLanguageChange,
} from "../client.js";

export const t = writable({});
export const currentLanguage = writable("");
export const isReady = writable(false);
let isInitializing = false;

const updateState = async () => {
  const instance = await initTradux();
  t.set(instance.t);
  currentLanguage.set(instance.currentLanguage);
  isReady.set(true);
};

onLanguageChange(updateState);

/** Explicit init for use in the root layout. Safe to call multiple times. */
export async function initSvelteTradux() {
  if (!get(isReady) && !isInitializing) {
    isInitializing = true;
    await updateState();
    isInitializing = false;
  }
}

/** Returns stores and helpers. Auto-inits if not already done. */
export function useTradux() {
  initSvelteTradux();

  return {
    t,
    currentLanguage,
    isReady,
    setLanguage: coreSetLanguage,
    getAvailableLanguages,
  };
}
