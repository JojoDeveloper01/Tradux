<script setup lang="ts">
import { computed, ref } from "vue";
import viteLogo from "../assets/vite.svg";
import heroImg from "../assets/hero.png";
import vueLogo from "../assets/vue.svg";
import { useTradux } from "tradux/vue";

const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } =
  useTradux();

const count = ref(0);
const translations = computed(() => t.value);
</script>

<template>
  <div v-if="isReady">
    <section id="center">
      <div class="hero">
        <img :src="heroImg" class="base" width="170" height="179" alt="" />
        <img :src="vueLogo" class="framework" alt="Vue logo" />
        <img :src="viteLogo" class="vite" alt="Vite logo" />
      </div>
      <div>
        <h1>{{ translations.hero.heading }}</h1>
        <p>{{ translations.hero.description }}</p>
      </div>
      <button class="counter" @click="count++">
        {{ translations.hero.counter }} {{ count }}
      </button>
      <select
        :value="currentLanguage"
        @change="
          (e: Event) => setLanguage((e.target as HTMLSelectElement).value)
        "
      >
        <option
          v-for="lang in getAvailableLanguages()"
          :key="lang.value"
          :value="lang.value"
        >
          {{ lang.name }}
        </option>
      </select>
    </section>

    <div class="ticks"></div>

    <section id="next-steps">
      <div id="docs">
        <svg class="icon" role="presentation" aria-hidden="true">
          <use href="/icons.svg#documentation-icon"></use>
        </svg>
        <h2>{{ translations.docs.heading }}</h2>
        <p>{{ translations.docs.description }}</p>
        <ul>
          <li>
            <a href="https://vite.dev/" target="_blank">
              <img class="logo" :src="viteLogo" alt="" />
              {{ translations.docs.exploreVite }}
            </a>
          </li>
          <li>
            <a href="https://vuejs.org/" target="_blank">
              <img class="button-icon" :src="vueLogo" alt="" />
              {{ translations.docs.learnMore }}
            </a>
          </li>
        </ul>
      </div>
      <div id="social">
        <svg class="icon" role="presentation" aria-hidden="true">
          <use href="/icons.svg#social-icon"></use>
        </svg>
        <h2>{{ translations.social.heading }}</h2>
        <p>{{ translations.social.description }}</p>
        <ul>
          <li>
            <a href="https://github.com/vitejs/vite" target="_blank">
              <svg class="button-icon" role="presentation" aria-hidden="true">
                <use href="/icons.svg#github-icon"></use>
              </svg>
              GitHub
            </a>
          </li>
          <li>
            <a href="https://chat.vite.dev/" target="_blank">
              <svg class="button-icon" role="presentation" aria-hidden="true">
                <use href="/icons.svg#discord-icon"></use>
              </svg>
              Discord
            </a>
          </li>
          <li>
            <a href="https://x.com/vite_js" target="_blank">
              <svg class="button-icon" role="presentation" aria-hidden="true">
                <use href="/icons.svg#x-icon"></use>
              </svg>
              X.com
            </a>
          </li>
          <li>
            <a href="https://bsky.app/profile/vite.dev" target="_blank">
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
  </div>
</template>
