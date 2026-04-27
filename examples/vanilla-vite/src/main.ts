import './style.css'
import typescriptLogo from './assets/typescript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { initTradux } from "tradux";
import { setupCounter } from './counter.ts'
import { setupLanguage } from './changeLanguage.ts'

async function renderApp() {
  const { t } = await initTradux();
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div id="isReady">
  <section id="center">
    <div class="hero">
      <img src="${heroImg}" class="base" width="170" height="179">
      <img src="${typescriptLogo}" class="framework" alt="TypeScript logo"/>
      <img src=${viteLogo} class="vite" alt="Vite logo" />
    </div>
    <div>
      <h1>${t.hero.heading}</h1>
      <p>${t.hero.description}</p>
    </div>
    <button id="counter" type="button" class="counter"></button>
    <select id="lang-select"></select>
  </section>

  <div class="ticks"></div>

  <section id="next-steps">
    <div id="docs">
      <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#documentation-icon"></use></svg>
      <h2>${t.docs.heading}</h2>
      <p>${t.docs.description}</p>
      <ul>
        <li>
          <a href="https://vite.dev/" target="_blank">
            <img class="logo" src=${viteLogo} alt="" />
            ${t.docs.exploreVite}
          </a>
        </li>
        <li>
          <a href="https://www.typescriptlang.org" target="_blank">
            <img class="button-icon" src="${typescriptLogo}" alt="">
            ${t.docs.learnMore}
          </a>
        </li>
      </ul>
    </div>
    <div id="social">
      <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#social-icon"></use></svg>
      <h2>${t.social.heading}</h2>
      <p>${t.social.description}</p>
      <ul>
        <li><a href="https://github.com/vitejs/vite" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#github-icon"></use></svg>GitHub</a></li>
        <li><a href="https://chat.vite.dev/" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#discord-icon"></use></svg>Discord</a></li>
        <li><a href="https://x.com/vite_js" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#x-icon"></use></svg>X.com</a></li>
        <li><a href="https://bsky.app/profile/vite.dev" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#bluesky-icon"></use></svg>Bluesky</a></li>
      </ul>
    </div>
  </section>

  <div class="ticks"></div>
  <section id="spacer"></section>
</div>
`
  setupCounter(document.querySelector<HTMLButtonElement>('#counter')!, t);
  setupLanguage(document.querySelector<HTMLSelectElement>('#lang-select')!, renderApp);
}
renderApp();
