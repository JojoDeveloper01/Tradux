import { writable, get } from "svelte/store";
import {
  initTradux,
  setLanguage as coreSetLanguage,
  getAvailableLanguages,
  onLanguageChange,
} from "../client.js";

// 1. GLOBAL STORES
export const t = writable({});
export const currentLanguage = writable("");
export const isReady = writable(false);
let isInitializing = false;

// 2. The Core Update Logic
const updateState = async () => {
  const instance = await initTradux();
  t.set(instance.t);
  currentLanguage.set(instance.currentLanguage);
  isReady.set(true);
};

// Listen for cross-app language changes
onLanguageChange(updateState);

// 3. Manual Init (For the "Global Root" approach)
export async function initSvelteTradux() {
  if (!get(isReady) && !isInitializing) {
    isInitializing = true;
    await updateState();
    isInitializing = false;
  }
}

// 4. The Smart Hook (For standalone components)
export function useTradux() {
  initSvelteTradux(); // Automatically safely initializes if needed

  return {
    t,
    currentLanguage,
    isReady,
    setLanguage: coreSetLanguage,
    getAvailableLanguages,
  };
}
