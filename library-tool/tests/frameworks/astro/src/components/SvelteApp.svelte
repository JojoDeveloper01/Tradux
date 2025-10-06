<script>
  import { t, setLanguage, currentLanguage, availableLanguages } from "tradux";

  function changeLanguage(event) {
    setLanguage(event.target.value);
    location.reload();
  }
</script>

<div>
  <h1>Svelte</h1>
  <h2>{t.welcome}</h2>
  <p>{t.navigation?.home}</p>
  <p>{t.navigation?.about}</p>
  <p>{t.navigation?.services}</p>

  <select value={currentLanguage} on:change={changeLanguage}>
    {#each availableLanguages as { name, value }}
      <option {value}>{name}</option>
    {/each}
  </select>
</div>
