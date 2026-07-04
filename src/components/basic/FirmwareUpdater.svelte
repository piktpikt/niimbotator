<script lang="ts">
  // PIKT: deep restyle — Bootstrap btn/form-control/input-group → M3 primitives (editor phase 5 finalize). Upstream PR candidate: no
  import type { FirmwareProgressEvent } from "@mmote/niimbluelib";
  import { printerClient } from "$/stores";
  import { Toasts } from "$/utils/toasts";
  import { FileUtils } from "$/utils/file_utils";
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";

  let fwVersion = $state<string>("");
  let fwVersionValid: boolean = $derived(/^\d+\.\d+$/.test(fwVersion));
  let fwProgress = $state<string>("");
  let fwData = $state<Uint8Array>();
  let fwName = $state<string>("");

  const browseFw = async () => {
    const file = await FileUtils.pickAndReadBinaryFile("bin");
    fwData = new Uint8Array(file.data);
    fwName = file.name;

    const match = fwName.match(/(\d+\.\d+)/);

    // For modern firmware images version is stored in header
    if (fwData.length >= 0x1C && fwData[0] === 0x18) {
      const verNumber = (fwData[0x15] << 8) + fwData[0x14];
      fwVersion = (verNumber / 100).toFixed(2);
    } else if (match) {
      fwVersion = match[1];
    } else {
      fwVersion = "";
    }
  };

  const upgradeFw = async () => {
    if (fwData === undefined) {
      return;
    }

    if (!confirm("Flashing wrong firmware can make your printer dead. Are you sure?")) {
      return;
    }

    const listener = (e: FirmwareProgressEvent) => {
      fwProgress = `${e.currentChunk}/${e.totalChunks}`;
    };

    $printerClient.stopHeartbeat();

    try {
      $printerClient.on("firmwareprogress", listener);
      fwProgress = "...";
      await $printerClient.abstraction.firmwareUpgrade(fwData, fwVersion);
      $printerClient.off("firmwareprogress", listener);
      await $printerClient.disconnect();

      Toasts.message("Flashing is finished, the printer will shut down now");

      fwData = undefined;
      fwName = "";
      fwVersion = "";
    } catch (e) {
      $printerClient.startHeartbeat();
      $printerClient.off("firmwareprogress", listener);
      Toasts.error(e);
    }

    fwProgress = "";
  };
</script>

<div class="firmware-updater">
  Firmware flashing
  <div class="mt-1 flex flex-wrap items-center gap-2">
    {#if fwProgress}
      <span class="text-label-medium text-surface-600-400">Uploading {fwProgress}</span>
    {:else}
      <span class="text-label-medium text-surface-600-400">To</span>
      <Button variant="tonal" ariaLabel={fwName} onclick={browseFw} disabled={!!fwProgress}>
        {fwName.length > 0 ? fwName.slice(0, 8) + "..." : "Browse..."}
      </Button>
      <span class="text-label-medium text-surface-600-400">ver.</span>
      <TextField
        value={fwVersion}
        type="text"
        placeholder="x.x"
        ariaLabel="Firmware version"
        onChange={(v) => {
          fwVersion = v;
        }} />

      <Button
        variant="filled"
        color="error"
        onclick={upgradeFw}
        disabled={!!fwProgress || !fwVersionValid || fwData === undefined}>Burn</Button>
    {/if}
  </div>
</div>
