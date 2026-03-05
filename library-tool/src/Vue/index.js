import { reactive, onMounted, toRefs } from "vue";
import {
  initTradux,
  setLanguage as coreSetLanguage,
  getAvailableLanguages,
  onLanguageChange,
} from "../client.js";

// 1. GLOBAL MEMORY
export const traduxState = reactive({
  t: {},
  currentLanguage: "",
  isReady: false,
});
let isInitializing = false;

// 2. The Core Update Logic
const updateState = async () => {
  const instance = await initTradux();
  traduxState.t = instance.t;
  traduxState.currentLanguage = instance.currentLanguage;
  traduxState.isReady = true;
};

// Listen for cross-app language changes
onLanguageChange(updateState);

// 3. Manual Init (For the "Global Root" approach)
export async function initVueTradux() {
  if (!traduxState.isReady && !isInitializing) {
    isInitializing = true;
    await updateState();
    isInitializing = false;
  }
}

// 4. The Smart Hook (For standalone components)
export function useTradux() {
  onMounted(() => {
    initVueTradux(); // Automatically safely initializes if needed
  });

  // Convert the reactive state into safe, destructure-friendly refs!
  const { t, currentLanguage, isReady } = toRefs(traduxState);

  return {
    t,
    currentLanguage,
    isReady,
    setLanguage: coreSetLanguage,
    getAvailableLanguages,
  };
}
