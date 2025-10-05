<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { tStore, setLanguage, getCurrentLanguage, getAvailableLanguages } from "tradux"

const availableLanguages = ref([])
const currentLanguage = ref('') 
const isLoading = ref(false)
const t = reactive({})

let unsubscribe

onMounted(async () => {
  availableLanguages.value = await getAvailableLanguages()
  currentLanguage.value = getCurrentLanguage()
  unsubscribe = tStore.subscribe(newTranslations => {
    Object.keys(t).forEach(key => delete t[key])
    Object.assign(t, newTranslations)
  })
})

onUnmounted(() => unsubscribe?.())

const changeLanguage = async () => {
  isLoading.value = true
  try {
    await setLanguage(currentLanguage.value)
    currentLanguage.value = getCurrentLanguage()
  } finally {
    isLoading.value = false
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

    <select v-model="currentLanguage" @change="changeLanguage" :disabled="isLoading">
      <option v-for="lang in availableLanguages" :key="lang" :value="lang">
        {{ lang }}
      </option>
    </select>
  </div>
</template>