<script lang="ts">
  import MainPage from "$/components/MainPage.svelte";
  import BatchPrintHarness from "$/components/pages/BatchPrintHarness.svelte";

  // DEV-only proof harness for the print screens, reachable at #bpv-harness.
  const showHarness =
    import.meta.env.DEV && typeof location !== "undefined" && location.hash.includes("bpv-harness");
</script>

{#if showHarness}
  <BatchPrintHarness />
{:else}
  <MainPage />
{/if}
