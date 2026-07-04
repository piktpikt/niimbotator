<script lang="ts">
  import MainPage from "$/components/MainPage.svelte";
  import BatchPrintHarness from "$/components/pages/BatchPrintHarness.svelte";
  import UiGallery from "$/components/pages/UiGallery.svelte";

  // DEV-only proof harnesses, reachable at #bpv-harness / #ui-gallery.
  const hash = typeof location !== "undefined" ? location.hash : "";
  const showHarness = import.meta.env.DEV && hash.includes("bpv-harness");
  const showGallery = import.meta.env.DEV && hash.includes("ui-gallery");
</script>

{#if showHarness}
  <BatchPrintHarness />
{:else if showGallery}
  <UiGallery />
{:else}
  <MainPage />
{/if}
