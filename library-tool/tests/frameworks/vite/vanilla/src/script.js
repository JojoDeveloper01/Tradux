import {
  tStore,
  setLanguage,
  getAvailableLanguages,
  getCurrentLanguage,
} from "tradux";

async function initializeLanguageSelect() {
  const select = document.getElementById("lang-select");
  const languages = await getAvailableLanguages();

  languages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang;
    option.textContent = lang;
    option.selected = lang === getCurrentLanguage();
    select.appendChild(option);
  });

  select.onchange = (e) => setLanguage(e.target.value);
}

tStore.subscribe((t) => {
  document.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.dataset.key;
    const keys = key?.split(".") ?? [];
    let value = t;
    keys.forEach((k) => (value = value?.[k]));
    el.textContent = typeof value === "string" ? value : "";
  });
});

export { initializeLanguageSelect };
