<script lang="ts">
  // PIKT: M3 top app bar — title, optional back, connection status chip, optional actions. (Chantier 0)
  import type { Snippet } from "svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";
  import { connectionState, connectedPrinterName } from "$/stores";
  import { navigate } from "$/stores/navigation";

  interface Props {
    title: string;
    onBack?: () => void;
    showPrinter?: boolean;
    actions?: Snippet;
  }

  let { title, onBack, showPrinter = true, actions }: Props = $props();

  let connected = $derived($connectionState === "connected");
</script>

<header
  class="sticky top-0 z-30 flex h-16 items-center gap-1 border-b border-surface-200-800 bg-surface-50-950/90 px-2 backdrop-blur">
  {#if onBack}
    <button
      type="button"
      aria-label="Retour"
      class="grid size-12 shrink-0 place-items-center rounded-full text-surface-700-300 hover:bg-surface-200-800/60"
      onclick={onBack}>
      <MdIcon icon="chevron_left" />
    </button>
  {/if}

  <h1 class="h4 flex-1 truncate font-semibold {onBack ? '' : 'pl-2'}">{title}</h1>

  {#if showPrinter}
    <button
      type="button"
      class="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium {connected
        ? 'preset-tonal-success'
        : 'preset-tonal-surface text-surface-600-400'}"
      onclick={() => navigate("settings")}>
      <span class="size-2 rounded-full {connected ? 'bg-success-500' : 'bg-surface-400-600'}"></span>
      <span class="hidden max-w-28 truncate sm:inline">
        {connected ? $connectedPrinterName || $tr("printer.connected") : $tr("printer.disconnected")}
      </span>
    </button>
  {/if}

  {@render actions?.()}
</header>
