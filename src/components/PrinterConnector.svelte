<script lang="ts">
  import { NiimbotCapacitorBleClient, SoundSettingsItemType, Utils, type AvailableTransports } from "@mmote/niimbluelib";
  import {
    printerClient,
    connectedPrinterName,
    connectionState,
    initClient,
    heartbeatData,
    printerInfo,
    printerMeta,
    heartbeatFails,
    automation,
    rfidInfo,
    ribbonRfidInfo,
    refreshRfidInfo,
  } from "$/stores";
  import type { ConnectionType } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { onMount } from "svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import type { IconName } from "$/styles/icon_data"; // PIKT: chrome icon union (Iconify), Chantier 0
  import FirmwareUpdater from "$/components/basic/FirmwareUpdater.svelte";
  import Button from "$/components/ui/Button.svelte"; // PIKT: M3 primitive (de-Bootstrap), Chantier 0
  import Dialog from "$/components/ui/Dialog.svelte"; // PIKT: M3 primitive (de-Bootstrap), Chantier 0

  let connectionType = $state<ConnectionType>("bluetooth");
  let featureSupport = $state<AvailableTransports>({ webBluetooth: false, webSerial: false, capacitorBle: false });

  // PIKT: local expander/dialog state replacing Bootstrap collapse + dropdown (de-Bootstrap), Chantier 0
  let showSettings = $state(false);
  let modelMetaOpen = $state(false);
  let rfidInfoOpen = $state(false);
  let ribbonRfidInfoOpen = $state(false);
  let heartbeatDataOpen = $state(false);
  let testsOpen = $state(false);

  const onConnectClicked = async () => {
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

  const onDisconnectClicked = () => {
    $printerClient.disconnect();
  };

  const startHeartbeat = async () => {
    $printerClient.startHeartbeat();
  };

  const stopHeartbeat = async () => {
    $printerClient.stopHeartbeat();
  };

  const soundOn = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, true);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, true);
  };

  const soundOff = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, false);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, false);
  };

  const fetchInfo = async () => {
    await $printerClient.fetchPrinterInfo();
  };

  const reset = async () => {
    await $printerClient.abstraction.printerReset();
  };

  const switchConnectionType = (c: ConnectionType) => {
    LocalStoragePersistence.saveLastConnectionType(c);
    connectionType = c;
  };

  const batteryIcon = (value: number): IconName => {
    if (value > 4) {
      value = Math.min(4, Math.max(1, Math.ceil(value / 25)));
    }

    if (value === 4) {
      return "battery_full";
    } else if (value === 3) {
      return "battery_5_bar";
    } else if (value === 2) {
      return "battery_3_bar";
    } else if (value === 1) {
      return "battery_2_bar";
    }
    return "battery_0_bar";
  };

  onMount(() => {
    featureSupport = Utils.getAvailableTransports();

    connectionType = LocalStoragePersistence.loadLastConnectionType() ?? "bluetooth";

    if (!featureSupport.capacitorBle && connectionType === "capacitor-ble") {
      connectionType = "bluetooth";
    }
    if (!featureSupport.webSerial && connectionType === "serial") {
      connectionType = "bluetooth";
    }
    if (!featureSupport.webBluetooth && connectionType === "bluetooth" && featureSupport.capacitorBle) {
      connectionType = "capacitor-ble";
    }

    if ($automation !== undefined && $automation.autoConnect && connectionType === "capacitor-ble") {
      onConnectClicked();
    }
  });
</script>

<div class="flex w-auto flex-nowrap items-center justify-end gap-2">
  {#if $connectionState === "connected"}
    <Button variant="tonal" color="secondary" ariaLabel="Settings" onclick={() => (showSettings = true)}>
      <MdIcon icon="settings" />
    </Button>

    <Dialog bind:show={showSettings} title="Printer">
      {#if $printerInfo}
        <div>
          Printer info:
          <ul>
            {#each Object.entries($printerInfo) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if $printerMeta}
        <Button variant="outlined" color="secondary" full onclick={() => (modelMetaOpen = !modelMetaOpen)}>
          Model metadata <MdIcon icon="expand_more" />
        </Button>

        {#if modelMetaOpen}
          <ul>
            {#each Object.entries($printerMeta) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        {/if}
      {/if}

      {#if $rfidInfo}
        <Button variant="outlined" color="secondary" full onclick={() => (rfidInfoOpen = !rfidInfoOpen)}>
          RFID info <MdIcon icon="expand_more" />
        </Button>

        {#if rfidInfoOpen}
          <Button variant="outlined" color="secondary" onclick={refreshRfidInfo}>Update</Button>

          <ul>
            {#each Object.entries($rfidInfo) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        {/if}
      {/if}

      {#if $ribbonRfidInfo}
        <Button variant="outlined" color="secondary" full onclick={() => (ribbonRfidInfoOpen = !ribbonRfidInfoOpen)}>
          Ribbon RFID info <MdIcon icon="expand_more" />
        </Button>

        {#if ribbonRfidInfoOpen}
          <Button variant="outlined" color="secondary" onclick={refreshRfidInfo}>Update</Button>

          <ul>
            {#each Object.entries($ribbonRfidInfo) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        {/if}
      {/if}

      {#if $heartbeatData}
        <Button variant="outlined" color="secondary" full onclick={() => (heartbeatDataOpen = !heartbeatDataOpen)}>
          Heartbeat data <MdIcon icon="expand_more" />
        </Button>

        {#if heartbeatDataOpen}
          <ul>
            {#each Object.entries($heartbeatData) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        {/if}
      {/if}

      <FirmwareUpdater />

      <Button variant="outlined" color="secondary" full onclick={() => (testsOpen = !testsOpen)}>
        Tests <MdIcon icon="expand_more" />
      </Button>

      {#if testsOpen}
        <div class="flex flex-wrap gap-1">
          <Button onclick={startHeartbeat}>Heartbeat on</Button>
          <Button onclick={stopHeartbeat}>Heartbeat off</Button>
          <Button onclick={soundOn}>Sound on</Button>
          <Button onclick={soundOff}>Sound off</Button>
          <Button onclick={fetchInfo}>Fetch info again</Button>
          <Button onclick={reset}>Reset</Button>
        </div>
      {/if}
    </Dialog>

    <span class="text-label-medium text-surface-600-400">
      {#if connectionType === "serial"}
        <MdIcon icon="usb" />
      {:else}
        <MdIcon icon="bluetooth" />
      {/if}
    </span>
    <span class="text-label-medium {$heartbeatFails > 0 ? 'text-warning-500' : 'text-surface-600-400'}">
      {$printerMeta?.model ?? $connectedPrinterName}
    </span>
    {#if $heartbeatData?.chargeLevel}
      <span class="text-label-medium text-surface-600-400">
        <MdIcon icon={batteryIcon($heartbeatData.chargeLevel)} class="r-90"></MdIcon>
      </span>
    {/if}
  {:else}
    {#if featureSupport.webBluetooth}
      <Button
        variant={connectionType === "bluetooth" ? "tonal" : "outlined"}
        color="secondary"
        icon="bluetooth"
        disabled={$connectionState === "connecting"}
        onclick={() => switchConnectionType("bluetooth")}>
        {$tr("connector.bluetooth")}
      </Button>
    {/if}
    {#if featureSupport.webSerial}
      <Button
        variant={connectionType === "serial" ? "tonal" : "outlined"}
        color="secondary"
        icon="usb"
        disabled={$connectionState === "connecting"}
        onclick={() => switchConnectionType((connectionType = "serial"))}>
        {$tr("connector.serial")}
      </Button>
    {/if}
    {#if featureSupport.capacitorBle}
      <Button
        variant={connectionType === "capacitor-ble" ? "tonal" : "outlined"}
        color="secondary"
        icon="usb"
        disabled={$connectionState === "connecting"}
        onclick={() => switchConnectionType((connectionType = "capacitor-ble"))}>
        Capacitor BLE
      </Button>
    {/if}
  {/if}

  {#if $connectionState !== "connected"}
    <Button
      variant="filled"
      ariaLabel="Connect"
      disabled={$connectionState === "connecting" ||
        (!featureSupport.capacitorBle && !featureSupport.webBluetooth && !featureSupport.webSerial)}
      onclick={onConnectClicked}>
      <MdIcon icon="power" />
    </Button>
  {/if}

  {#if $connectionState === "connected"}
    <Button variant="filled" color="error" ariaLabel="Disconnect" onclick={onDisconnectClicked}>
      <MdIcon icon="power_off" />
    </Button>
  {/if}
</div>
