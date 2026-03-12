/**
 * Vue adapter for Tradux.
 *
 * Uses a single `reactive()` state object shared by all components.
 * Two ways to use:
 *   - `initVueTradux()` in your app root (e.g. App.vue setup)
 *   - `useTradux()` composable in any component (auto-inits if needed)
 * Language changes propagate automatically via the traduxEvents system.
 */

import { reactive, onMounted, toRefs } from "vue";
import {
  initTradux,
  setLanguage as coreSetLanguage,
  getAvailableLanguages,
  onLanguageChange,
} from "../client.js";

// Shared reactive state — Vue's reactivity system tracks mutations automatically.
export const traduxState = reactive({
  t: {},
  currentLanguage: "",
  isReady: false,
});
let isInitializing = false;

const updateState = async (lang = null) => {
  const instance = await initTradux(lang);
  traduxState.t = new Proxy(instance.t, {});
  traduxState.currentLanguage = instance.currentLanguage;
  traduxState.isReady = true;
};

onLanguageChange(updateState);

/** Explicit init for use in the app root. Safe to call multiple times.
 *  Pass a language code (e.g. from a cookie) during SSR to pre-populate state. */
export async function initVueTradux(lang = null) {
  if (!traduxState.isReady && !isInitializing) {
    isInitializing = true;
    await updateState(lang);
    isInitializing = false;
  }
}

/** Composable that auto-inits on mount and returns destructurable refs. */
export function useTradux() {
  onMounted(() => {
    initVueTradux();
  });

  const { t, currentLanguage, isReady } = toRefs(traduxState);

  return {
    t,
    currentLanguage,
    isReady,
    setLanguage: coreSetLanguage,
    getAvailableLanguages,
  };
}
