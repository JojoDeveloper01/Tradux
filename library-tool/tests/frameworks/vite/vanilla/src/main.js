import { initializeLanguageSelect } from './script.js'

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

initializeLanguageSelect();
