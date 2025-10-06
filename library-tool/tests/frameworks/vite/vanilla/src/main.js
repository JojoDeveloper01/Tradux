document.querySelector('#app').innerHTML = `
  <section>
    <h1>Vanilla JS + Vite</h1>

    <h2 data-key="welcome"></h2>

    <p data-key="navigation.home"></p>
    <p data-key="navigation.about"></p>
    <p data-key="navigation.services"></p>

    <select id="lang-select"></select>
  </section>
`

import {
  t,
  setLanguage,
  availableLanguages,
  currentLanguage,
} from "tradux";

const select = document.getElementById("lang-select");

availableLanguages.forEach(function ({ name, value }) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = name;
  option.selected = value === currentLanguage;
  select.appendChild(option);
});

select.onchange = function (e) {
  const selectedLang = e.target.value;
  if (selectedLang !== currentLanguage) {
    setLanguage(selectedLang);
    location.reload();
  }
};

document.querySelectorAll("[data-key]").forEach(function (el) {
  const key = el instanceof HTMLElement ? el.dataset.key : undefined;
  const keys = key ? key.split(".") : [];
  let value = t;
  keys.forEach(function (k) { value = value && value[k]; });
  if (el instanceof HTMLElement) {
    el.textContent = typeof value === "string" ? value : "";
  }
});