<script lang="ts">
  import {
    LabelPresetSchema,
    type LabelPreset,
    type LabelProps,
    type LabelShape,
    type LabelSplit,
    type LabelUnit,
    type MirrorType,
    type TailPosition,
  } from "$/types";
  import LabelPresetsBrowser from "$/components/designer-controls/LabelPresetsBrowser.svelte";
  import { printerMeta } from "$/stores";
  import { tr } from "$/utils/i18n";
  import { DEFAULT_LABEL_PRESETS } from "$/defaults";
  import { onMount, tick } from "svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import type { PrintDirection } from "@mmote/niimbluelib";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { FileUtils } from "$/utils/file_utils";
  import { z } from "zod";
  import DpiSelector from "$/components/designer-controls/DpiSelector.svelte";
  // PIKT: deep restyle — Bootstrap dropdown/form → M3 ui/* primitives + BottomSheet (editor phase 5).
  // Upstream PR candidate: no
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import Select from "$/components/ui/Select.svelte";
  import SegmentedButton from "$/components/ui/SegmentedButton.svelte";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";

  let openLabelEditor = $state(false);

  interface Props {
    labelProps: LabelProps;
    onChange: (newProps: LabelProps) => void;
  }

  let { labelProps, onChange }: Props = $props();

  const tailPositions: TailPosition[] = ["right", "bottom", "left", "top"];
  const printDirections: PrintDirection[] = ["left", "top"];
  const labelShapes: LabelShape[] = ["rect", "rounded_rect", "circle"];
  const labelSplits: LabelSplit[] = ["none", "vertical", "horizontal"];
  const mirrorTypes: MirrorType[] = ["none", "flip", "copy"];

  let labelPresets = $state<LabelPreset[]>(DEFAULT_LABEL_PRESETS);

  let title = $state<string | undefined>("");
  let prevUnit: LabelUnit = "mm";
  let unit = $state<LabelUnit>("mm");
  let dpmm = $state<number>(8);
  let width = $state<number>(0);
  let height = $state<number>(0);
  let printDirection = $state<PrintDirection>("left");
  let shape = $state<LabelShape>("rect");
  let split = $state<LabelSplit>("none");
  let splitParts = $state<number>(2);
  let tailLength = $state<number>(0);
  let tailPos = $state<TailPosition>("right");
  let mirror = $state<MirrorType>("none");

  let error = $derived.by<string>(() => {
    let error = "";

    const headSize = labelProps.printDirection == "left" ? labelProps.size.height : labelProps.size.width;
    if ($printerMeta !== undefined) {
      if (headSize > $printerMeta.printheadPixels) {
        error += $tr("params.label.warning.width") + " ";
        error += `(${headSize} > ${$printerMeta.printheadPixels})`;
        error += "\n";
      }

      if ($printerMeta.printDirection !== labelProps.printDirection) {
        error += $tr("params.label.warning.direction") + " ";
        if ($printerMeta.printDirection == "left") {
          error += $tr("params.label.direction.left");
        } else {
          error += $tr("params.label.direction.top");
        }
      }
    }

    if (headSize % 8 !== 0) {
      error += $tr("params.label.warning.div8");
    }

    return error;
  });

  const onApply = () => {
    let newWidth = width;
    let newHeight = height;
    let newTailLength = tailLength;

    // mm to px
    if (unit === "mm") {
      newWidth *= dpmm;
      newHeight *= dpmm;
      newTailLength *= dpmm;
    }

    // limit min size
    newWidth = newWidth < dpmm ? dpmm : newWidth;
    newHeight = newHeight < dpmm ? dpmm : newHeight;

    // width must me multiple of 8
    if (printDirection === "left") {
      newHeight -= newHeight % 8;
    } else {
      newWidth -= newWidth % 8;
    }

    onChange({
      printDirection: printDirection,
      size: {
        width: Math.floor(newWidth),
        height: Math.floor(newHeight),
      },
      shape,
      split,
      splitParts,
      tailPos,
      tailLength: Math.floor(newTailLength),
      mirror,
    });
  };

  const onLabelPresetSelected = (index: number) => {
    const preset = labelPresets[index];

    if (preset !== undefined) {
      dpmm = preset.dpmm;
      prevUnit = preset.unit;
      unit = preset.unit;
      printDirection = preset.printDirection;
      width = preset.width;
      height = preset.height;
      title = preset.title ?? "";
      shape = preset.shape ?? "rect";
      split = preset.split ?? "none";
      splitParts = preset.splitParts ?? 2;
      tailPos = preset.tailPos ?? "right";
      tailLength = preset.tailLength ?? 0;
      mirror = preset.mirror ?? "none";
    }

    onApply();
  };

  const onLabelPresetDelete = (idx: number) => {
    const result = [...labelPresets];
    result.splice(idx, 1);
    labelPresets = result;
    LocalStoragePersistence.saveLabelPresets(labelPresets);
  };

  const onLabelPresetAdd = () => {
    const newPreset: LabelPreset = {
      dpmm,
      printDirection,
      unit,
      width,
      height,
      title,
      shape,
      split,
      splitParts,
      tailPos,
      tailLength,
      mirror,
    };
    const newPresets = [...labelPresets, newPreset];
    try {
      LocalStoragePersistence.saveLabelPresets(newPresets);
      labelPresets = newPresets;
    } catch (e) {
      Toasts.zodErrors(e, "Presets save error:");
    }
  };

  const onFlip = () => {
    let widthTmp = width;
    width = height;
    height = widthTmp;
    printDirection = printDirection === "top" ? "left" : "top";
  };

  const onUnitChange = () => {
    if (prevUnit === "mm" && unit === "px") {
      width = Math.floor(width * dpmm);
      height = Math.floor(height * dpmm);
      tailLength = Math.floor(tailLength * dpmm);
    } else if (prevUnit === "px" && unit === "mm") {
      width = Math.floor(width / dpmm);
      height = Math.floor(height / dpmm);
      tailLength = Math.floor(tailLength / dpmm);
    }
    prevUnit = unit;
  };

  const fillWithCurrentParams = () => {
    prevUnit = "px";
    width = labelProps.size.width;
    height = labelProps.size.height;
    printDirection = labelProps.printDirection;
    shape = labelProps.shape ?? "rect";
    split = labelProps.split ?? "none";
    splitParts = labelProps.splitParts ?? 2;
    tailPos = labelProps.tailPos ?? "right";
    tailLength = labelProps.tailLength ?? 0;
    mirror = labelProps.mirror ?? "none";
    onUnitChange();
  };

  const onImportClicked = async () => {
    const contents = await FileUtils.pickAndReadSingleTextFile("json");
    const rawData = JSON.parse(contents);

    if (!confirm($tr("params.label.warning.import"))) {
      return;
    }

    try {
      const presets = z.array(LabelPresetSchema).parse(rawData);
      LocalStoragePersistence.saveLabelPresets(presets);
      labelPresets = presets;
    } catch (e) {
      Toasts.zodErrors(e, "Presets load error:");
    }
  };

  const onExportClicked = () => {
    try {
      FileUtils.saveLabelPresetsAsJson(labelPresets);
    } catch (e) {
      Toasts.zodErrors(e, "Presets save error:");
    }
  };

  onMount(() => {
    const defaultPreset: LabelPreset = DEFAULT_LABEL_PRESETS[0];
    width = defaultPreset.width;
    height = defaultPreset.height;
    prevUnit = defaultPreset.unit;
    unit = defaultPreset.unit;
    printDirection = defaultPreset.printDirection;
    shape = defaultPreset.shape ?? "rect";
    split = defaultPreset.split ?? "none";
    tailPos = defaultPreset.tailPos ?? "right";
    tailLength = defaultPreset.tailLength ?? 0;
    mirror = defaultPreset.mirror ?? "none";

    try {
      const savedPresets: LabelPreset[] | null = LocalStoragePersistence.loadLabelPresets();
      if (savedPresets !== null) {
        labelPresets = savedPresets;
      }
    } catch (e) {
      Toasts.zodErrors(e, "Presets load error:");
    }

    tick().then(() => fillWithCurrentParams());
  });

  $effect(() => {
    if (shape === "circle" && split !== "none") split = "none";
  });

  $effect(() => {
    if (split === "none" || tailLength < 0) tailLength = 0;
  });

  $effect(() => {
    if (mirror === "flip" && splitParts !== 2) mirror = "copy";
  });
</script>

<button class="tool-action" onclick={() => (openLabelEditor = true)}>
  <MdIcon icon="settings" /><span>{$tr("editor.toolbar.size")}</span>
</button>

<BottomSheet bind:open={openLabelEditor} title={$tr("params.label.menu_title")}>
  <div class="flex flex-col gap-4">
    <div class="flex gap-2">
      <Button variant="outlined" icon="data_object" onclick={onImportClicked}>{$tr("params.label.import")}</Button>
      <Button variant="outlined" icon="data_object" onclick={onExportClicked}>{$tr("params.label.export")}</Button>
    </div>

    <div class="flex items-center gap-2 {error ? 'cursor-help text-warning-500' : 'text-surface-600-400'}" title={error}>
      <span class="text-body-medium">
        {$tr("params.label.current")}
        {labelProps.size.width}x{labelProps.size.height}
        {$tr("params.label.px")}
        {#if labelProps.printDirection === "top"}
          ({$tr("params.label.direction")} {$tr("params.label.direction.top")})
        {:else if labelProps.printDirection === "left"}
          ({$tr("params.label.direction")} {$tr("params.label.direction.left")})
        {/if}
      </span>
      <Button
        variant="text"
        icon="arrow_downward"
        ariaLabel={$tr("params.label.current")}
        onclick={fillWithCurrentParams} />
    </div>

    <LabelPresetsBrowser
      presets={labelPresets}
      onItemSelected={onLabelPresetSelected}
      onItemDelete={onLabelPresetDelete} />

    <div class="flex items-end gap-2">
      <div class="flex-1">
        <TextField
          type="number"
          label={$tr("params.label.size")}
          min={1}
          value={width}
          onChange={(v) => (width = Number(v))} />
      </div>
      <Button variant="tonal" icon="swap_horiz" ariaLabel={$tr("params.label.size")} onclick={onFlip} />
      <div class="flex-1">
        <TextField type="number" min={1} value={height} onChange={(v) => (height = Number(v))} />
      </div>
      <div class="flex-1">
        <Select
          value={unit}
          options={[
            { value: "mm", label: $tr("params.label.mm") },
            { value: "px", label: $tr("params.label.px") },
          ]}
          onChange={(v) => {
            unit = v as LabelUnit;
            onUnitChange();
          }} />
      </div>
    </div>

    {#if unit !== "px"}
      <DpiSelector bind:value={dpmm} />
    {/if}

    <div class="flex flex-col gap-1.5">
      <span class="text-label-medium text-surface-600-400">{$tr("params.label.direction")}</span>
      <SegmentedButton
        ariaLabel={$tr("params.label.direction")}
        value={printDirection}
        options={[
          { value: "left", label: $tr("params.label.direction.left") },
          { value: "top", label: $tr("params.label.direction.top") },
        ]}
        onChange={(v) => (printDirection = v)} />
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-label-medium text-surface-600-400">{$tr("params.label.shape")}</span>
      <SegmentedButton
        ariaLabel={$tr("params.label.shape")}
        value={shape}
        options={[
          { value: "rect", icon: "crop_square", ariaLabel: "rect" },
          { value: "rounded_rect", icon: "rounded_corner", ariaLabel: "rounded_rect" },
          { value: "circle", icon: "radio_button_unchecked", ariaLabel: "circle" },
        ]}
        onChange={(v) => (shape = v)} />
    </div>

    {#if shape !== "circle"}
      <div class="flex flex-col gap-1.5">
        <span class="text-label-medium text-surface-600-400">{$tr("params.label.split")}</span>
        <SegmentedButton
          ariaLabel={$tr("params.label.split")}
          value={split}
          options={[
            { value: "none", icon: "crop_square", ariaLabel: "none" },
            { value: "vertical", icon: "view_week", ariaLabel: "vertical" },
            { value: "horizontal", icon: "segment", ariaLabel: "horizontal" },
          ]}
          onChange={(v) => (split = v)} />
      </div>

      {#if split !== "none"}
        <TextField
          type="number"
          label={$tr("params.label.split.count")}
          min={1}
          value={splitParts}
          onChange={(v) => (splitParts = Number(v))} />
      {/if}
    {/if}

    {#if split !== "none"}
      <div class="flex flex-col gap-1.5">
        <span class="text-label-medium text-surface-600-400">{$tr("params.label.mirror")}</span>
        <SegmentedButton
          ariaLabel={$tr("params.label.mirror")}
          value={mirror}
          options={[
            { value: "none", icon: "radio_button_unchecked", ariaLabel: "none" },
            { value: "copy", icon: "content_copy", ariaLabel: "copy" },
            { value: "flip", icon: "swap_horiz", ariaLabel: "flip" },
          ]}
          onChange={(v) => (mirror = v)} />
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-label-medium text-surface-600-400">{$tr("params.label.tail.position")}</span>
        <SegmentedButton
          ariaLabel={$tr("params.label.tail.position")}
          value={tailPos}
          options={[
            { value: "right", icon: "chevron_right", ariaLabel: "right" },
            { value: "bottom", icon: "arrow_downward", ariaLabel: "bottom" },
            { value: "left", icon: "chevron_left", ariaLabel: "left" },
            { value: "top", icon: "vertical_align_top", ariaLabel: "top" },
          ]}
          onChange={(v) => (tailPos = v)} />
      </div>

      <div class="flex items-end gap-2">
        <div class="flex-1">
          <TextField
            type="number"
            label={$tr("params.label.tail.length")}
            min={1}
            value={tailLength}
            onChange={(v) => (tailLength = Number(v))} />
        </div>
        <span class="pb-3 text-label-medium text-surface-600-400">
          {#if unit === "mm"}{$tr("params.label.mm")}{/if}
          {#if unit === "px"}{$tr("params.label.px")}{/if}
        </span>
      </div>
    {/if}

    <TextField
      type="text"
      label={$tr("params.label.label_title")}
      value={title ?? ""}
      onChange={(v) => (title = v)} />

    <div class="flex justify-end gap-2">
      <Button variant="tonal" onclick={onLabelPresetAdd}>{$tr("params.label.save_template")}</Button>
      <Button variant="filled" onclick={onApply}>{$tr("params.label.apply")}</Button>
    </div>
  </div>
</BottomSheet>

<style>
  .cursor-help {
    cursor: help;
  }
</style>
