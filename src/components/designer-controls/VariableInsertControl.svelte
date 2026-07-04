<script lang="ts">
  // PIKT: deep restyle — Bootstrap JS dropdown → self-managed M3 popover + ui/Button (editor phase 2).
  // Upstream PR candidate: no
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import QRCode from "$/fabric-object/qrcode";
  import Barcode from "$/fabric-object/barcode";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import Button from "$/components/ui/Button.svelte";

  interface Props {
    selectedObject: fabric.FabricObject;
    valueUpdated: () => void;
  }

  let { selectedObject, valueUpdated }: Props = $props();

  let open = $state(false);
  let root: HTMLDivElement | undefined = $state();

  const insertDateTime = (format?: string) => {
    let value = "{dt}";
    if (format) {
      value = `{dt|${format}}`;
    }

    if (selectedObject instanceof fabric.IText) {
      selectedObject.exitEditing();
      selectedObject.set({ text: `${selectedObject.text}${value}` });
    } else if (selectedObject instanceof QRCode) {
      selectedObject.set({ text: `${selectedObject.text}${value}` });
    } else if (selectedObject instanceof Barcode) {
      selectedObject.set({ text: `${selectedObject.text}${value}` });
    }

    valueUpdated();
  };
</script>

<svelte:window
  onclick={(e) => {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }} />

<div bind:this={root} class="relative inline-block">
  <Button
    variant="tonal"
    icon="data_object"
    ariaLabel={$tr("params.variables.insert")}
    onclick={() => (open = !open)} />

  {#if open}
    <div class="absolute z-20 mt-1 flex flex-wrap gap-1 rounded-m3-sm bg-surface-100-900 p-2 shadow-e2">
      <Button
        variant="text"
        color="secondary"
        onclick={() => {
          insertDateTime();
          open = false;
        }}>
        <MdIcon icon="calendar_today" />
        {$tr("params.variables.insert.datetime")}
      </Button>
      <Button
        variant="text"
        color="secondary"
        onclick={() => {
          insertDateTime("YYYY-MM-DD");
          open = false;
        }}>
        <MdIcon icon="calendar_today" />
        {$tr("params.variables.insert.date")}
      </Button>
      <Button
        variant="text"
        color="secondary"
        onclick={() => {
          insertDateTime("HH:mm:ss");
          open = false;
        }}>
        <MdIcon icon="schedule" />
        {$tr("params.variables.insert.time")}
      </Button>
    </div>
  {/if}
</div>
