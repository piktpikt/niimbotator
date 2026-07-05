<script lang="ts">
  // PIKT: Editor-header connection chip (Roadmap P2). Shows connection status and opens the shared
  // PrinterSheet. The connection engine + known-printers UI now live in PrinterSheet (mounted at the
  // app root), so this is a thin status affordance.
  import { connectionState, connectedPrinterName, printerMeta, heartbeatData } from "$/stores";
  import { openPrinterSheet } from "$/stores/printerSheet";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { IconName } from "$/styles/icon_data";

  let connected = $derived($connectionState === "connected");

  const batteryIcon = (value: number): IconName => {
    if (value > 4) value = Math.min(4, Math.max(1, Math.ceil(value / 25)));
    if (value === 4) return "battery_full";
    if (value === 3) return "battery_5_bar";
    if (value === 2) return "battery_3_bar";
    if (value === 1) return "battery_2_bar";
    return "battery_0_bar";
  };
</script>

<button
  type="button"
  aria-label={$tr("printer.sheet.title")}
  class="flex h-9 items-center gap-1.5 rounded-full px-3 text-label-large {connected
    ? 'preset-tonal-success'
    : 'preset-tonal-surface text-surface-600-400'}"
  onclick={openPrinterSheet}>
  <span class="size-2 rounded-full {connected ? 'bg-success-500' : 'bg-surface-400-600'}"></span>
  <span class="max-w-40 truncate">
    {connected ? ($printerMeta?.model ?? $connectedPrinterName ?? $tr("printer.connected")) : $tr("printer.disconnected")}
  </span>
  {#if connected && $heartbeatData?.chargeLevel}
    <MdIcon icon={batteryIcon($heartbeatData.chargeLevel)} class="r-90" />
  {/if}
</button>
