<script lang="ts">
  // PIKT: Connection bottom sheet (Roadmap P2). The single home for connecting/reconnecting: it owns
  // the connection engine (transport detection, connect/reconnect, sound, refresh, disconnect) and the
  // known-printers list. Mounted once at the app root; opened from the header connection chips.
  import {
    NiimbotCapacitorBleClient,
    SoundSettingsItemType,
    Utils,
    type AvailableTransports,
  } from "@mmote/niimbluelib";
  import { onMount } from "svelte";
  import {
    printerClient,
    connectionState,
    connectedPrinterName,
    initClient,
    heartbeatData,
    printerMeta,
    automation,
    detectedLabel,
    refreshRfidInfo,
    pendingRollFormat,
  } from "$/stores";
  import { activePrinterMetrics } from "$/stores/printerMetrics";
  import { knownPrinters, forgetPrinter } from "$/stores/knownPrinters";
  import { printerSheetOpen } from "$/stores/printerSheet";
  import type { ConnectionType } from "$/types";
  import type { KnownPrinter } from "$/db/schema";
  import { tr, type TranslationKey } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import type { IconName } from "$/styles/icon_data";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { lookupLabelSize } from "$/services/labelSizeLookup"; // PIKT: manual RFID barcode entry (P3)

  let connectionType = $state<ConnectionType>("bluetooth");
  let featureSupport = $state<AvailableTransports>({ webBluetooth: false, webSerial: false, capacitorBle: false });
  let soundEnabled = $state(true); // optimistic (the printer exposes no readable sound state)

  let connected = $derived($connectionState === "connected");
  let connecting = $derived($connectionState === "connecting");

  const transports: { type: ConnectionType; labelKey: TranslationKey; icon: IconName; available: () => boolean }[] = [
    { type: "bluetooth", labelKey: "connector.bluetooth", icon: "bluetooth", available: () => featureSupport.webBluetooth },
    { type: "capacitor-ble", labelKey: "connector.bluetooth", icon: "bluetooth", available: () => featureSupport.capacitorBle },
    { type: "serial", labelKey: "connector.serial", icon: "usb", available: () => featureSupport.webSerial },
  ];
  let availableTransports = $derived(transports.filter((t) => t.available()));

  const switchConnectionType = (c: ConnectionType) => {
    LocalStoragePersistence.saveLastConnectionType(c);
    connectionType = c;
  };

  const connect = async () => {
    initClient(connectionType);
    connectionState.set("connecting");
    try {
      if ($printerClient instanceof NiimbotCapacitorBleClient && $automation?.autoConnectDeviceId !== undefined) {
        await $printerClient.connect({ deviceId: $automation.autoConnectDeviceId });
      } else {
        await $printerClient.connect();
      }
    } catch (e) {
      connectionState.set("disconnected");
      Toasts.error(e);
    }
  };

  const reconnect = async (p: KnownPrinter) => {
    if (p.transport !== "capacitor-ble") {
      // Web Bluetooth / Serial can't reconnect by id — fall back to a normal (picker) connect.
      switchConnectionType(p.transport);
      await connect();
      return;
    }
    switchConnectionType("capacitor-ble");
    initClient("capacitor-ble");
    connectionState.set("connecting");
    try {
      await ($printerClient as NiimbotCapacitorBleClient).connect({ deviceId: p.id });
    } catch (e) {
      connectionState.set("disconnected");
      Toasts.error(e);
    }
  };

  const forget = async (p: KnownPrinter) => {
    await forgetPrinter(p.id);
    Toasts.message($tr("printer.known.forgotten"));
  };

  const disconnect = () => $printerClient?.disconnect();

  const refresh = async () => {
    try {
      await $printerClient.fetchPrinterInfo();
      refreshRfidInfo();
      Toasts.message($tr("printer.refreshed"));
    } catch (e) {
      Toasts.error(e);
    }
  };

  // PIKT (P3): apply the RFID-detected roll size to the editor's label (mm -> px at the printer's dpmm).
  // Posts to a one-shot store the editor consumes; opt-in because resizing the canvas rewrites the layout.
  const applyDetectedSize = () => {
    const label = $detectedLabel;
    if (!label) return;
    // Snapshot the roll now so a later heartbeat re-scan can't change what gets applied.
    pendingRollFormat.set({ detected: label, dpmm: $activePrinterMetrics.dpmm });
    Toasts.message($tr("printer.format.applied"));
    printerSheetOpen.set(false);
  };

  // PIKT (P3): manual fallback when RFID can't auto-detect the roll — look the barcode up in the cloud/cache
  // and surface it as the detected label (so "Appliquer le format" then applies it).
  let manualBarcode = $state("");
  let looking = $state(false);
  const manualLookup = async () => {
    const code = manualBarcode.trim();
    if (!code || looking) return;
    looking = true;
    try {
      const label = await lookupLabelSize(code);
      if (label) {
        detectedLabel.set(label);
        manualBarcode = "";
        Toasts.message($tr("printer.format.lookup_ok"));
      } else {
        Toasts.message($tr("printer.format.lookup_none"));
      }
    } finally {
      looking = false;
    }
  };

  const toggleSound = async () => {
    const next = !soundEnabled;
    soundEnabled = next; // optimistic
    try {
      await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, next);
      await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, next);
    } catch (e) {
      soundEnabled = !next; // revert on failure
      Toasts.error(e);
    }
  };

  const batteryIcon = (value: number): IconName => {
    if (value > 4) value = Math.min(4, Math.max(1, Math.ceil(value / 25)));
    if (value === 4) return "battery_full";
    if (value === 3) return "battery_5_bar";
    if (value === 2) return "battery_3_bar";
    if (value === 1) return "battery_2_bar";
    return "battery_0_bar";
  };

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const relTime = (t: number): string => {
    const mins = Math.round((t - Date.now()) / 60000);
    if (mins > -60) return rtf.format(Math.min(0, mins), "minute");
    const hrs = Math.round(mins / 60);
    if (hrs > -24) return rtf.format(hrs, "hour");
    return rtf.format(Math.round(hrs / 24), "day");
  };

  onMount(() => {
    featureSupport = Utils.getAvailableTransports();
    connectionType = LocalStoragePersistence.loadLastConnectionType() ?? "bluetooth";
    if (!featureSupport.capacitorBle && connectionType === "capacitor-ble") connectionType = "bluetooth";
    if (!featureSupport.webSerial && connectionType === "serial") connectionType = "bluetooth";
    if (!featureSupport.webBluetooth && connectionType === "bluetooth" && featureSupport.capacitorBle) {
      connectionType = "capacitor-ble";
    }
    if ($automation?.autoConnect && connectionType === "capacitor-ble") connect();
  });
</script>

<BottomSheet bind:open={$printerSheetOpen} title={$tr("printer.sheet.title")}>
  {#if connected}
    <!-- Connected: user-facing status card -->
    <section class="rounded-m3-lg bg-surface-200-800/50 p-4">
      <div class="flex items-center gap-3">
        <span class="grid size-11 shrink-0 place-items-center rounded-full bg-success-500/15 text-success-600-400">
          <MdIcon icon="print" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="truncate text-title-medium">{$printerMeta?.model ?? $connectedPrinterName}</div>
          <div class="flex items-center gap-1 text-label-medium text-success-600-400">
            <span class="size-2 rounded-full bg-success-500"></span>
            {$tr("printer.connected")}
          </div>
        </div>
        {#if $heartbeatData?.chargeLevel}
          <MdIcon icon={batteryIcon($heartbeatData.chargeLevel)} class="r-90 text-surface-600-400" />
        {/if}
      </div>

      <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-label-medium">
        <div>
          <dt class="text-surface-500">{$tr("printer.status.label")}</dt>
          <dd class="text-surface-800-200">
            {#if $detectedLabel}{$detectedLabel.widthMm} × {$detectedLabel.heightMm} mm{:else}—{/if}
          </dd>
        </div>
        <div>
          <dt class="text-surface-500">{$tr("printer.status.resolution")}</dt>
          <dd class="text-surface-800-200">{$activePrinterMetrics.dpi ?? "—"} dpi</dd>
        </div>
        <div>
          <dt class="text-surface-500">{$tr("printer.status.density")}</dt>
          <dd class="text-surface-800-200">
            {$activePrinterMetrics.densityMin}–{$activePrinterMetrics.densityMax}
            <span class="text-surface-500">· {$activePrinterMetrics.densityDefault}</span>
          </dd>
        </div>
        <div>
          <dt class="text-surface-500">{$tr("printer.status.max_width")}</dt>
          <dd class="text-surface-800-200">
            {#if $activePrinterMetrics.maxLabelWidthMm}{$activePrinterMetrics.maxLabelWidthMm} mm{:else}—{/if}
          </dd>
        </div>
      </dl>
    </section>

    <div class="mt-4 flex flex-wrap gap-2">
      {#if $detectedLabel}
        <Button variant="tonal" color="primary" icon="aspect_ratio" onclick={applyDetectedSize}>
          {$tr("printer.format.apply")}
        </Button>
      {/if}
      <Button variant="tonal" color="secondary" icon="refresh" onclick={refresh}>{$tr("printer.action.refresh")}</Button>
      <Button variant="tonal" color="secondary" icon={soundEnabled ? "volume_up" : "volume_off"} onclick={toggleSound}>
        {soundEnabled ? $tr("printer.action.sound_on") : $tr("printer.action.sound_off")}
      </Button>
      <Button variant="filled" color="error" icon="power_off" onclick={disconnect}>
        {$tr("printer.action.disconnect")}
      </Button>
    </div>

    <!-- Manual fallback when RFID can't auto-detect the roll -->
    <div class="mt-4 flex items-end gap-2">
      <div class="flex-1">
        <TextField
          label={$tr("printer.format.manual_label")}
          value={manualBarcode}
          onChange={(v) => (manualBarcode = v)} />
      </div>
      <Button variant="tonal" color="secondary" icon="search" onclick={manualLookup} disabled={!manualBarcode || looking}>
        {$tr("printer.format.lookup")}
      </Button>
    </div>
  {:else}
    <!-- Disconnected: transport + known printers + connect -->
    <div class="flex flex-wrap gap-2">
      {#each availableTransports as t (t.type)}
        <Button
          variant={connectionType === t.type ? "tonal" : "outlined"}
          color="secondary"
          icon={t.icon}
          disabled={connecting}
          onclick={() => switchConnectionType(t.type)}>
          {t.type === "capacitor-ble" ? "BLE" : $tr(t.labelKey)}
        </Button>
      {/each}
    </div>

    {#if $knownPrinters && $knownPrinters.length > 0}
      <h3 class="mt-5 mb-2 text-label-large text-surface-500">{$tr("printer.known.title")}</h3>
      <ul class="flex flex-col gap-1">
        {#each $knownPrinters as p (p.id)}
          <li class="flex items-center gap-2 rounded-m3-lg bg-surface-200-800/40 p-2 pl-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary-500/15 text-primary-500">
              <MdIcon icon="print" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-body-medium">{p.modelName ?? p.name}</div>
              <div class="text-label-small text-surface-500">{relTime(p.lastConnectedAt)}</div>
            </div>
            <Button variant="tonal" color="primary" disabled={connecting} onclick={() => reconnect(p)}>
              {$tr("printer.known.reconnect")}
            </Button>
            <button
              type="button"
              aria-label={$tr("printer.known.forget")}
              class="grid size-10 shrink-0 place-items-center rounded-full text-surface-500 hover:bg-surface-300-700/60"
              onclick={() => forget(p)}>
              <MdIcon icon="delete" />
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="mt-5 text-body-small text-surface-500">{$tr("printer.known.empty")}</p>
    {/if}

    <div class="mt-4">
      <Button
        variant="filled"
        full
        icon="add"
        disabled={connecting || (!featureSupport.capacitorBle && !featureSupport.webBluetooth && !featureSupport.webSerial)}
        onclick={connect}>
        {connecting ? $tr("printer.connecting") : $tr("printer.connect.other")}
      </Button>
    </div>
  {/if}
</BottomSheet>
