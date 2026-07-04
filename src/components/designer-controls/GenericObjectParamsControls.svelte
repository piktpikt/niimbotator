<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import { appConfig } from "$/stores";
  import ObjectPositionControls from "$/components/designer-controls/ObjectPositionControls.svelte";
  import Button from "$/components/ui/Button.svelte";
  import Switch from "$/components/ui/Switch.svelte";
  import Select from "$/components/ui/Select.svelte";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  // PIKT: keep-ratio toggle (Chantier 2). Hiding the side handles leaves only the corner handles,
  // which scale uniformly — i.e. resizing preserves the object's proportions.
  let keepRatio = $state<boolean>(false);

  // PIKT: M3 restyle — Bootstrap dropdown menus replaced by BottomSheet; each sheet owns its open state.
  let arrangeOpen = $state<boolean>(false);
  let fitModeOpen = $state<boolean>(false);

  $effect(() => {
    editRevision;
    keepRatio = (selectedObject as unknown as { pikKeepRatio?: boolean }).pikKeepRatio ?? false;
  });

  const toggleKeepRatio = () => {
    keepRatio = !keepRatio;
    (selectedObject as unknown as { pikKeepRatio?: boolean }).pikKeepRatio = keepRatio;
    // Hide the mid-edge handles so only the corner handles remain — those scale uniformly
    // (canvas.uniformScaling defaults to true), i.e. resizing preserves proportions.
    selectedObject.setControlsVisibility({ mt: !keepRatio, mb: !keepRatio, ml: !keepRatio, mr: !keepRatio });
    selectedObject.setCoords();
    selectedObject.canvas?.renderAll();
  };

  const putToCenterV = () => {
    selectedObject.canvas!.centerObjectV(selectedObject);
    valueUpdated();
  };

  const putToCenterH = () => {
    selectedObject.canvas!.centerObjectH(selectedObject);
    valueUpdated();
  };

  const bringTo = (to: "top" | "bottom") => {
    if (to === "top") {
      selectedObject.canvas?.bringObjectToFront(selectedObject);
    } else if (to === "bottom") {
      selectedObject.canvas?.sendObjectToBack(selectedObject);
    }
  };

  const fit = () => {
    const imageRatio = selectedObject.width / selectedObject.height;
    const canvasRatio = selectedObject.canvas!.width / selectedObject.canvas!.height;

    if ($appConfig.fitMode === "ratio_min") {
      if (imageRatio > canvasRatio) {
        selectedObject.scaleToWidth(selectedObject.canvas!.width);
      } else {
        selectedObject.scaleToHeight(selectedObject.canvas!.height);
      }
      selectedObject.canvas!.centerObject(selectedObject);
    } else if ($appConfig.fitMode === "ratio_max") {
      if (imageRatio > canvasRatio) {
        selectedObject.scaleToHeight(selectedObject.canvas!.height);
      } else {
        selectedObject.scaleToWidth(selectedObject.canvas!.width);
      }
      selectedObject.canvas!.centerObject(selectedObject);
    } else {
      selectedObject.set({
        left: 0,
        top: 0,
        scaleX: selectedObject.canvas!.width / selectedObject.width,
        scaleY: selectedObject.canvas!.height / selectedObject.height,
      });
    }
    valueUpdated();
  };

  const fitModeChanged = (fitMode: "stretch" | "ratio_min" | "ratio_max") => {
    appConfig.update((v) => ({ ...v, fitMode: fitMode }));
  };
</script>

<input type="hidden" value={editRevision}>

<Button
  variant="tonal"
  color="secondary"
  icon="vertical_distribute"
  ariaLabel={$tr("params.generic.center.vertical")}
  onclick={putToCenterV} />
<Button
  variant="tonal"
  color="secondary"
  icon="horizontal_distribute"
  ariaLabel={$tr("params.generic.center.horizontal")}
  onclick={putToCenterH} />

<Switch
  checked={keepRatio}
  onChange={toggleKeepRatio}
  ariaLabel={$tr("params.generic.keep_ratio")} />

<ObjectPositionControls {selectedObject} />

<Button
  variant="tonal"
  color="secondary"
  icon="segment"
  ariaLabel={$tr("params.generic.arrange")}
  onclick={() => (arrangeOpen = true)} />

<BottomSheet bind:open={arrangeOpen} title={$tr("params.generic.arrange")}>
  <div class="flex flex-col gap-2">
    <Button variant="text" color="secondary" onclick={() => bringTo("top")}>
      {$tr("params.generic.arrange.top")}
    </Button>
    <Button variant="text" color="secondary" onclick={() => bringTo("bottom")}>
      {$tr("params.generic.arrange.bottom")}
    </Button>
  </div>
</BottomSheet>

{#if selectedObject instanceof fabric.FabricImage}
  <Button
    variant="tonal"
    color="secondary"
    icon="fit_screen"
    ariaLabel={$tr("params.generic.fit")}
    onclick={fit} />
  <Button
    variant="tonal"
    color="secondary"
    icon="unfold_more"
    ariaLabel={$tr("params.generic.fit")}
    onclick={() => (fitModeOpen = true)} />

  <BottomSheet bind:open={fitModeOpen} title={$tr("params.generic.fit")}>
    <Select
      value={$appConfig.fitMode ?? "stretch"}
      ariaLabel={$tr("params.generic.fit")}
      options={[
        { value: "stretch", label: $tr("params.generic.fit.mode.stretch") },
        { value: "ratio_min", label: $tr("params.generic.fit.mode.ratio_min") },
        { value: "ratio_max", label: $tr("params.generic.fit.mode.ratio_max") },
      ]}
      onChange={(v) => fitModeChanged(v as "stretch" | "ratio_min" | "ratio_max")} />
  </BottomSheet>
{/if}
