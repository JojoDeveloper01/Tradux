<script setup>
import { ref, onMounted } from 'vue'
import { t, setLanguage, getAvailableLanguages, getCurrentLanguage } from "tradux"

const selectedLanguage = ref('')

onMounted(async () => {
  selectedLanguage.value = await getCurrentLanguage()
})

const changeLanguage = async (e) => {
  const newLang = e.target.value
  if (await setLanguage(newLang)) {
    selectedLanguage.value = newLang
    window.location.reload()
  }
}
</script>

<template>
  <h1>Vue</h1>
  <h2>{{ t.welcome }}</h2>
  <p>{{ t.navigation.home }}</p>
  <p>{{ t.navigation.about }}</p>
  <p>{{ t.navigation.services }}</p>
  <select v-model="selectedLanguage" @change="changeLanguage">
    <option v-for="lang in getAvailableLanguages()" :key="lang.value" :value="lang.value">
      {{ lang.name }}
    </option>
  </select>
</template>