// changeLanguage.ts
import { initTradux, setLanguage, getAvailableLanguages, onLanguageChange } from "tradux";

export async function setupLanguage(element: HTMLSelectElement, rerender: () => void) {
    const { currentLanguage } = await initTradux();

    getAvailableLanguages().forEach(({ name, value }) => {
        element.add(new Option(name, value, false, value === currentLanguage));
    });

    onLanguageChange(rerender);
    element.onchange = async (e: Event) => {
        await setLanguage((e.target as HTMLSelectElement).value);
        rerender();
    };
}