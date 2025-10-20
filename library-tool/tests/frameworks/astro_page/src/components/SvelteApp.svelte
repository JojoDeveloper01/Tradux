<script>
  import {
    t,
    setLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    initialized,
  } from "tradux";
  import { onMount } from "svelte";

  let currentLanguage = "";
  let languages = [];
  let ready = false;

  onMount(async () => {
    // Wait for Tradux to finish loading configs and language definitions
    await initialized;

    // Get the current language (initializeForLanguage)
    currentLanguage = await getCurrentLanguage();

    // Get available languages after init
    languages = getAvailableLanguages();

    ready = true; // allow rendering
  });

  async function changeLanguage(event) {
    const lang = event.target.value;
    if (await setLanguage(lang)) {
      currentLanguage = lang;
      location.reload(); // optional
    }
  }
</script>

{#if ready}
  <div>
    <h1>Svelte</h1>
    <h2>{t.welcome}</h2>
    <p>{t.navigation.home}</p>
    <p>{t.navigation.about}</p>
    <p>{t.navigation.services}</p>

    <select bind:value={currentLanguage} on:change={changeLanguage}>
      {#each languages as { name, value }}
        <option {value}>{name}</option>
      {/each}
    </select>
  </div>
{:else}
  <p>Loading translations...</p>
{/if}
