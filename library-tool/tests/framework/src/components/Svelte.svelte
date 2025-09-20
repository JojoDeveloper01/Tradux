<script>
  import { onMount } from "svelte";
  import {
    tStore,
    setLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
  } from "tradux";

  let availableLanguages = [];
  let currentLanguage = "";
  let t = {};
  let unsubscribe = null;

  onMount(async () => {
    availableLanguages = await getAvailableLanguages();
    currentLanguage = getCurrentLanguage();

    unsubscribe = tStore.subscribe((newTranslations) => {
      t = { ...newTranslations };
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  async function changeLanguage(event) {
    await setLanguage(event.target.value);
    currentLanguage = getCurrentLanguage();
  }
</script>

<div>
  <h1>Svelte</h1>
  <h2>{t.welcome}</h2>
  <p>{t.navigation?.home}</p>
  <p>{t.navigation?.about}</p>
  <p>{t.navigation?.services}</p>

  <select value={currentLanguage} on:change={changeLanguage}>
    {#each availableLanguages as lang}
      {#if lang && typeof lang === "string"}
        <option value={lang}>{lang}</option>
      {/if}
    {/each}
  </select>
</div>
