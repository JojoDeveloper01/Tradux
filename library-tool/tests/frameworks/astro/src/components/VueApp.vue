<script setup>
import { ref } from 'vue'
import { t, setLanguage, currentLanguage, availableLanguages } from "tradux"

const selectedLanguage = ref(currentLanguage)

const changeLanguage = async (e) => {
    const newLang = e.target.value
    const success = await setLanguage(newLang)
    if (success) {
        selectedLanguage.value = newLang
        window.location.reload()
    }
}
</script>

<template>
  <div>
    <h1>Vue</h1>
    <h2>{{ t.welcome }}</h2>
    <p>{{ t.navigation?.home }}</p>
    <p>{{ t.navigation?.about }}</p>
    <p>{{ t.navigation?.services }}</p>

    <select v-model="selectedLanguage" @change="changeLanguage">
      <option v-for="lang in availableLanguages" :key="lang.value" :name="lang.name" :value="lang.value">
        {{ lang.name }}
      </option>
    </select>
  </div>
</template>