<script>
  import { useTradux } from "tradux/svelte";

  const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } =
    useTradux();
</script>

{#if $isReady}
  <div>
    <h1>{$t.welcome}</h1>
    <p>{$t.navigation.home}</p>
    <p>{$t.navigation.about}</p>
    <p>{$t.navigation.services}</p>

    <select
      value={$currentLanguage}
      on:change={(e) => setLanguage(e.target.value)}
    >
      {#each getAvailableLanguages() as { name, value }}
        <option {value}>{name}</option>
      {/each}
    </select>
  </div>
{:else}
  <p>Loading translations...</p>
{/if}
