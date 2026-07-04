<script lang="ts">
  // PIKT: deep restyle — Bootstrap dropdown → M3 ui/BottomSheet + TextField/Switch (editor phase 5).
  // Upstream PR candidate: no
  import { tr } from "$/utils/i18n";
  import * as fabric from "fabric";
  import { onDestroy } from "svelte";
  import QRCode from "$/fabric-object/qrcode";
  import Barcode from "$/fabric-object/barcode";
  import Button from "$/components/ui/Button.svelte";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import Switch from "$/components/ui/Switch.svelte";

  interface Props {
    selectedObject: fabric.FabricObject;
  }

  let { selectedObject }: Props = $props();
  let prevObject: fabric.FabricObject | undefined;

  let open = $state(false);

  let x = $state<number>();
  let y = $state<number>();
  let width = $state<number>();
  let height = $state<number>();
  let widthScaled = $state<number>();
  let heightScaled = $state<number>();
  let keepAspectRatio = $state<boolean>(false);

  const objectDimensionsChanged = (e?: fabric.ModifiedEvent) => {
    const pos = selectedObject.getPointByOrigin("left", "top");
    x = pos.x;
    y = pos.y;
    width = selectedObject.width;
    height = selectedObject.height;

    updateScales(e?.action);
  };

  const objectChanged = (newObject: fabric.FabricObject) => {
    if (prevObject !== undefined) {
      prevObject.off("modified", objectDimensionsChanged);
    }

    newObject.on("modified", objectDimensionsChanged);
    objectDimensionsChanged();

    prevObject = newObject;
  };

  const updateObject = (e: Event, source?: "width" | "height") => {
    const newPos = new fabric.Point(Math.round(x!), Math.round(y!));

    selectedObject.setPositionByOrigin(newPos, "left", "top");

    if (selectedObject instanceof fabric.FabricImage) {
      if (keepAspectRatio) {
        let scale = source === "width" ? widthScaled! / selectedObject.width! : heightScaled! / selectedObject.height!;

        selectedObject.scaleX = scale;
        selectedObject.scaleY = scale;
      } else {
        selectedObject.scaleX = widthScaled! / selectedObject.width!;
        selectedObject.scaleY = heightScaled! / selectedObject.height!;
      }

      updateScales();
    } else
      selectedObject.set({
        width: Math.round(Math.max(width!, 1)),
        height: Math.round(Math.max(height!, 1)),
      });

    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
  };

  const toggleAspectRatio = (e: Event) => {
    if (keepAspectRatio) {
      selectedObject.scaleX = Math.min(selectedObject.scaleX, selectedObject.scaleY);
      selectedObject.scaleY = selectedObject.scaleX;
      updateScales();

      updateObject(e);
    }
  };

  const updateScales = (action?: string) => {
    widthScaled = Math.round(width! * selectedObject.scaleX);
    heightScaled = Math.round(height! * selectedObject.scaleY);

    if (action === "scaleX" || action === "scaleY") keepAspectRatio = false;
    if ((action === "scale" || action === undefined) && selectedObject.scaleX === selectedObject.scaleY)
      keepAspectRatio = true;
  };

  onDestroy(() => selectedObject.off("modified", objectDimensionsChanged));

  $effect(() => {
    objectChanged(selectedObject);
  });
</script>

<Button
  variant="tonal"
  color="secondary"
  icon="control_camera"
  ariaLabel={$tr("params.generic.position")}
  onclick={() => (open = true)} />

<BottomSheet bind:open title={$tr("params.generic.position")}>
  <div class="flex flex-col gap-3">
    <TextField
      type="number"
      label="x"
      value={x ?? ""}
      onChange={(v) => {
        x = Number(v);
        updateObject(undefined as unknown as Event);
      }} />
    <TextField
      type="number"
      label="y"
      value={y ?? ""}
      onChange={(v) => {
        y = Number(v);
        updateObject(undefined as unknown as Event);
      }} />
    {#if !(selectedObject instanceof fabric.FabricText || selectedObject instanceof fabric.FabricImage || selectedObject instanceof QRCode || selectedObject instanceof Barcode)}
      <div class="flex items-end gap-2">
        <TextField
          type="number"
          min={1}
          value={width ?? ""}
          onChange={(v) => {
            width = Number(v);
            updateObject(undefined as unknown as Event);
          }} />
        <span class="pb-3 text-body-large text-surface-600-400">x</span>
        <TextField
          type="number"
          min={1}
          value={height ?? ""}
          onChange={(v) => {
            height = Number(v);
            updateObject(undefined as unknown as Event);
          }} />
      </div>
    {/if}
    {#if selectedObject instanceof fabric.FabricImage}
      <div class="flex items-end gap-2">
        <TextField
          type="number"
          min={1}
          value={widthScaled ?? ""}
          onChange={(v) => {
            widthScaled = Number(v);
            updateObject(undefined as unknown as Event, "width");
          }} />
        <span class="pb-3 text-body-large text-surface-600-400">x</span>
        <TextField
          type="number"
          min={1}
          value={heightScaled ?? ""}
          onChange={(v) => {
            heightScaled = Number(v);
            updateObject(undefined as unknown as Event, "height");
          }} />
      </div>
      <label class="flex items-center gap-3">
        <Switch
          checked={keepAspectRatio}
          ariaLabel={$tr("params.generic.keepAspectRatio")}
          onChange={(b) => {
            keepAspectRatio = b;
            toggleAspectRatio(undefined as unknown as Event);
          }} />
        <span class="text-body-large">{$tr("params.generic.keepAspectRatio")}</span>
      </label>
    {/if}
  </div>
</BottomSheet>
