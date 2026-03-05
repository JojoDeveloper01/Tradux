/**
 * React adapter for Tradux.
 *
 * Provides a `useTradux()` hook that returns reactive translation state.
 * Uses a module-level cache so that when multiple components call the hook,
 * only the first triggers an async init — the rest get instant values.
 * Listens for cross-component language changes via the traduxEvents system.
 */

import { useState, useEffect } from "react";
import {
  initTradux,
  setLanguage as coreSetLanguage,
  getAvailableLanguages,
  onLanguageChange,
} from "../client.js";

// Shared across all hook instances so subsequent mounts are instant.
let cachedState = {
  t: {},
  currentLanguage: "",
  isReady: false,
};

export function useTradux() {
  const [state, setState] = useState(cachedState);

  useEffect(() => {
    let mounted = true;

    const syncState = async () => {
      const instance = await initTradux();

      cachedState = {
        t: instance.t,
        currentLanguage: instance.currentLanguage,
        isReady: true,
      };

      if (mounted) {
        setState(cachedState);
      }
    };

    // Sync on every mount (handles Vite/React Strict Mode double-mount)
    syncState();

    // Re-sync when any component calls setLanguage()
    onLanguageChange(syncState);

    return () => {
      mounted = false;
    };
  }, []);

  return {
    t: state.t,
    currentLanguage: state.currentLanguage,
    isReady: state.isReady,
    setLanguage: coreSetLanguage,
    getAvailableLanguages,
  };
}
