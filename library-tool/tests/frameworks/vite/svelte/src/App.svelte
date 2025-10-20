<script>
  import {
    t,
    setLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
  } from "tradux";

  let currentLanguage = "";

  async function init() {
    currentLanguage = await getCurrentLanguage();
  }
  init();

  async function changeLanguage(event) {
    const lang = event.target.value;
    if (await setLanguage(lang)) {
      currentLanguage = lang;
      window.location.reload();
    }
  }
</script>

<div>
  <h1>Svelte</h1>
  <h2>{t.welcome}</h2>
  <p>{t.navigation.home}</p>
  <p>{t.navigation.about}</p>
  <p>{t.navigation.services}</p>
  <select bind:value={currentLanguage} on:change={changeLanguage}>
    {#each getAvailableLanguages() as { name, value }}
      <option {value}>{name}</option>
    {/each}
  </select>
</div>
