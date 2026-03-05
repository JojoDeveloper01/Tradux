import { useState, useEffect } from "react";
import {
  initTradux,
  setLanguage as coreSetLanguage,
  getAvailableLanguages,
  onLanguageChange,
} from "../client.js";

// Global cache so subsequent components load instantly without flashing "Loading"
let cachedState = {
  t: {},
  currentLanguage: "",
  isReady: false,
};

export function useTradux() {
  // Initialize with whatever is in the cache right now
  const [state, setState] = useState(cachedState);

  useEffect(() => {
    let mounted = true;

    const syncState = async () => {
      // Because initTradux uses `browserInstancePromise` in client.js,
      // calling this 1000 times safely returns the exact same promise!
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

    // 1. Always sync on mount (This fixes the Vite Strict Mode bug!)
    syncState();

    // 2. Listen for cross-app language changes
    onLanguageChange(syncState);

    // Cleanup listener when component unmounts
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
