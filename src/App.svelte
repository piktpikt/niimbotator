<script lang="ts">
  import { onMount } from "svelte";
  import MainPage from "$/components/MainPage.svelte";
  import BatchPrintHarness from "$/components/pages/BatchPrintHarness.svelte";
  import UiGallery from "$/components/pages/UiGallery.svelte";
  import ConfirmHost from "$/components/ui/ConfirmHost.svelte";
  import { ensureDeviceCatalog } from "$/services/deviceCatalog";
  // Side-effect import: registers the active-metrics persistence + refresh-on-connect subscriptions
  // at startup, so they run regardless of which screen the user opens (Roadmap P1).
  import "$/stores/printerMetrics";

  // DEV-only proof harnesses, reachable at #bpv-harness / #ui-gallery.
  const hash = typeof location !== "undefined" ? location.hash : "";
  const showHarness = import.meta.env.DEV && hash.includes("bpv-harness");
  const showGallery = import.meta.env.DEV && hash.includes("ui-gallery");

  onMount(() => {
    // PIKT: warm the printer catalog from the bundled snapshot/cache and refresh it live in the
    // background, so per-printer print metrics work offline after first launch (Roadmap P1).
    void ensureDeviceCatalog();
  });
</script>

{#if showHarness}
  <BatchPrintHarness />
{:else if showGallery}
  <UiGallery />
{:else}
  <MainPage />
{/if}

<ConfirmHost />
