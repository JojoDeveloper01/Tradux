<script setup>
import { useTradux } from "tradux/vue";

const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } =
  useTradux();
</script>

<template>
  <div v-if="isReady">
    <h1>Vue</h1>

    <h2>{{ t.welcome }}</h2>
    <p>{{ t.navigation.home }}</p>
    <p>{{ t.navigation.about }}</p>
    <p>{{ t.navigation.services }}</p>

    <select
      :value="currentLanguage"
      @change="(e) => setLanguage(e.target.value)"
    >
      <option
        v-for="lang in getAvailableLanguages()"
        :key="lang.value"
        :value="lang.value"
      >
        {{ lang.name }}
      </option>
    </select>
  </div>
  <div v-else>
    <p>Loading translations...</p>
  </div>
</template>
