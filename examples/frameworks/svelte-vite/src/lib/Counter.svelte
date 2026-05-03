<script lang="ts">
  import { useTradux } from "tradux/svelte";
  const { t } = useTradux();

  let count: number = $state(0);
  const increment = () => {
    count += 1;
  };
</script>

<button class="counter" onclick={increment}>
  {$t.hero.counter}: {count}
</button>
