<script lang="ts">
  import { useTradux } from "tradux/svelte";
  import svelteLogo from "./assets/svelte.svg";
  import viteLogo from "./assets/vite.svg";
  import heroImg from "./assets/hero.png";
  import Counter from "./lib/Counter.svelte";

  const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } =
    useTradux();
</script>

{#if $isReady}
  <section id="center">
    <div class="hero">
      <img src={heroImg} class="base" width="170" height="179" alt="" />
      <img src={svelteLogo} class="framework" alt="Svelte logo" />
      <img src={viteLogo} class="vite" alt="Vite logo" />
    </div>
    <div>
      <h1>{$t.hero.heading}</h1>
      <p>{$t.hero.description}</p>
    </div>
    <Counter />
    <select
      value={$currentLanguage}
      on:change={(e: Event) =>
        setLanguage((e.target as HTMLSelectElement).value)}
    >
      {#each getAvailableLanguages() as { name, value }}
        <option {value}>{name}</option>
      {/each}
    </select>
  </section>

  <div class="ticks"></div>

  <section id="next-steps">
    <div id="docs">
      <svg class="icon" role="presentation" aria-hidden="true">
        <use href="/icons.svg#documentation-icon"></use>
      </svg>
      <h2>{$t.docs.heading}</h2>
      <p>{$t.docs.description}</p>
      <ul>
        <li>
          <a href="https://vite.dev/" target="_blank" rel="noreferrer">
            <img class="logo" src={viteLogo} alt="" />
            {$t.docs.exploreVite}
          </a>
        </li>
        <li>
          <a href="https://svelte.dev/" target="_blank" rel="noreferrer">
            <img class="button-icon" src={svelteLogo} alt="" />
            {$t.docs.learnMore}
          </a>
        </li>
      </ul>
    </div>
    <div id="social">
      <svg class="icon" role="presentation" aria-hidden="true">
        <use href="/icons.svg#social-icon"></use>
      </svg>
      <h2>{$t.social.heading}</h2>
      <p>{$t.social.description}</p>
      <ul>
        <li>
          <a
            href="https://github.com/vitejs/vite"
            target="_blank"
            rel="noreferrer"
          >
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#github-icon"></use>
            </svg>
            GitHub
          </a>
        </li>
        <li>
          <a href="https://chat.vite.dev/" target="_blank" rel="noreferrer">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#discord-icon"></use>
            </svg>
            Discord
          </a>
        </li>
        <li>
          <a href="https://x.com/vite_js" target="_blank" rel="noreferrer">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#x-icon"></use>
            </svg>
            X.com
          </a>
        </li>
        <li>
          <a
            href="https://bsky.app/profile/vite.dev"
            target="_blank"
            rel="noreferrer"
          >
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#bluesky-icon"></use>
            </svg>
            Bluesky
          </a>
        </li>
      </ul>
    </div>
  </section>

  <div class="ticks"></div>
  <section id="spacer"></section>
{/if}
