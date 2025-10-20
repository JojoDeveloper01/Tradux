
import { t, setLanguage, getAvailableLanguages, getCurrentLanguage } from "tradux";

document.querySelector('#app').innerHTML = `
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
  const select = document.getElementById("lang-select");
  const currentLanguage = await getCurrentLanguage();
  const availableLanguages = getAvailableLanguages();

  availableLanguages.forEach(({ name, value }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    if (value === currentLanguage) option.selected = true;
    select.appendChild(option);
  });

  select.onchange = async (e) => {
    const selectedLang = e.target.value;
    if (selectedLang !== currentLanguage) {
      await setLanguage(selectedLang);
      window.location.reload();
    }
  };

  document.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.dataset.key;
    const value = key.split(".").reduce((acc, k) => acc && acc[k], t);
    el.textContent = typeof value === "string" ? value : "";
  });
})();