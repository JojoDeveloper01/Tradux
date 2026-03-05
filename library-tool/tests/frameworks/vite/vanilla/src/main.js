import {
  initTradux,
  setLanguage,
  getAvailableLanguages,
  onLanguageChange,
} from "tradux";

document.querySelector("#app").innerHTML = `
  <section>
    <h1>Vanilla JS + Vite</h1>
    <h2 data-key="welcome"></h2>
    <p data-key="navigation.home"></p>
    <p data-key="navigation.about"></p>
    <p data-key="navigation.services"></p>
    <select id="lang-select"></select>
  </section>
`;

(async () => {
  // 1. Initialize tradux first
  const instance = await initTradux();
  const select = document.getElementById("lang-select");
  const availableLanguages = getAvailableLanguages();

  // 2. Populate language dropdown
  availableLanguages.forEach(({ name, value }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    if (value === instance.currentLanguage) option.selected = true;
    select.appendChild(option);
  });

  // 3. Function to update DOM with translations
  function updateTranslations() {
    document.querySelectorAll("[data-key]").forEach((el) => {
      const key = el.dataset.key;
      const value = key
        .split(".")
        .reduce((acc, k) => acc && acc[k], instance.t);
      el.textContent = typeof value === "string" ? value : "";
    });
  }

  // 4. Initial render
  updateTranslations();

  // 5. Handle language change - no reload needed!
  select.onchange = async (e) => {
    const selectedLang = e.target.value;
    if (selectedLang !== instance.currentLanguage) {
      await setLanguage(selectedLang);
      select.value = instance.currentLanguage;
      updateTranslations();
    }
  };

  // 6. Listen for language changes from other tabs/instances
  onLanguageChange(() => {
    updateTranslations();
  });
})();
