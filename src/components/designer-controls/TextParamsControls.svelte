<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import FontFamilyPicker from "$/components/designer-controls/FontFamilyPicker.svelte";
  import { TextboxExt } from "$/fabric-object/textbox-ext";
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import ThermalFill from "$/components/ui/ThermalFill.svelte";
  import SegmentedButton from "$/components/ui/SegmentedButton.svelte";
  import Switch from "$/components/ui/Switch.svelte";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";

  let colorOpen = $state(false);

  interface Props {
    selectedText: fabric.IText;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedText, editRevision, valueUpdated }: Props = $props();

  let sizeMin: number = 1;
  let sizeMax: number = 999;

  const setXAlign = (align: fabric.TOriginX) => {
    selectedText.set({ textAlign: align });
    valueUpdated();
  };

  const setYAlign = (align: fabric.TOriginY) => {
    // change object origin, but keep position
    const pos = selectedText.getPointByOrigin("left", "top");
    selectedText.set({ originY: align });
    selectedText.setPositionByOrigin(pos, "left", "top");
    valueUpdated();
  };

  const toggleBold = () => {
    if (selectedText.fontWeight === "bold") {
      selectedText.fontWeight = "normal";
    } else {
      selectedText.fontWeight = "bold";
    }
    valueUpdated();
  };

  const toggleItalic = () => {
    if (selectedText.fontStyle === "italic") {
      selectedText.fontStyle = "normal";
    } else {
      selectedText.fontStyle = "italic";
    }
    valueUpdated();
  };

  const toggleFontAutoSize = () => {
    if (selectedText instanceof TextboxExt) {
      selectedText.set({ fontAutoSize: !selectedText.fontAutoSize });
    }
    valueUpdated();
  };

  const updateFontFamily = (v: string) => {
    selectedText.set({ fontFamily: v });
    valueUpdated();
  };

  const fontSizeUp = () => {
    let s = selectedText.fontSize;
    selectedText.set({ fontSize: Math.min(s > 40 ? Math.round(s * 1.1) : s + 2, sizeMax) });
    valueUpdated();
  };

  const fontSizeDown = () => {
    let s = selectedText.fontSize;
    selectedText.set({ fontSize: Math.max(s > 40 ? Math.round(s * 0.9) : s - 2, sizeMin) });
    valueUpdated();
  };

  const lineHeightChange = (v: number) => {
    v = isNaN(v) ? 1 : v;
    selectedText.set({ lineHeight: v });
    valueUpdated();
  };

  const fontSizeChange = (v: number) => {
    v = isNaN(v) ? 1 : Math.min(Math.max(v, sizeMin), sizeMax);
    selectedText.set({ fontSize: v });
    valueUpdated();
  };

  const fillChanged = (value: string) => {
    selectedText.set({ fill: value });
    valueUpdated();
  };

  const splitChanged = (value: string) => {
    if (selectedText instanceof fabric.Textbox) {
      selectedText.set({ splitByGrapheme: value === "grapheme" });
      valueUpdated();
    }
  };

  const backgroundColorChanged = (value: string) => {
    selectedText.set({ backgroundColor: value });
    valueUpdated();
  };

  const editInPopup = () => {
    const text = prompt($tr("params.text.edit.title"), selectedText.text);
    if (text !== null) {
      selectedText.set({ text });
      selectedText.isEditing = false;
      valueUpdated();
    }
  };


</script>

<!-- Fix component not updating when selectedText changes. I didn't find a better way to do this. -->
<input type="hidden" value={editRevision}>

<div class="tool-cell">
  <SegmentedButton
    value={selectedText.textAlign}
    options={[
      { value: "left", icon: "format_align_left", ariaLabel: $tr("params.text.align.left") },
      { value: "center", icon: "format_align_center", ariaLabel: $tr("params.text.align.center") },
      { value: "right", icon: "format_align_right", ariaLabel: $tr("params.text.align.right") },
    ]}
    onChange={(v) => setXAlign(v as fabric.TOriginX)} />
</div>

<div class="tool-cell">
  <SegmentedButton
    ariaLabel={$tr("params.text.vorigin")}
    value={selectedText.originY}
    options={[
      { value: "top", icon: "vertical_align_top", ariaLabel: $tr("params.text.vorigin.top") },
      { value: "center", icon: "vertical_align_center", ariaLabel: $tr("params.text.vorigin.center") },
      { value: "bottom", icon: "vertical_align_bottom", ariaLabel: $tr("params.text.vorigin.bottom") },
    ]}
    onChange={(v) => setYAlign(v as fabric.TOriginY)} />
</div>

<div class="tool-action">
  <Switch
    ariaLabel={$tr("params.text.bold")}
    checked={selectedText.fontWeight === "bold"}
    onChange={toggleBold} />
</div>

<div class="tool-action">
  <Switch
    ariaLabel={$tr("params.text.italic")}
    checked={selectedText.fontStyle === "italic"}
    onChange={toggleItalic} />
</div>

<Button
  variant="tonal"
  icon="format_color_fill"
  ariaLabel={$tr("params.vector.fill")}
  onclick={() => (colorOpen = true)}>
  {$tr("params.vector.fill")}
</Button>

<BottomSheet bind:open={colorOpen} title={$tr("params.vector.fill")}>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col gap-2">
      <span class="text-label-medium text-surface-600-400">{$tr("params.fill.text")}</span>
      <ThermalFill
        value={typeof selectedText.fill === "string" ? selectedText.fill : "black"}
        ariaLabel={$tr("params.fill.text")}
        options={[
          { value: "black", label: $tr("params.color.black") },
          { value: "white", label: $tr("params.color.white") },
        ]}
        onChange={(v) => fillChanged(v)} />
    </div>
    <div class="flex flex-col gap-2">
      <span class="text-label-medium text-surface-600-400">{$tr("params.fill.background")}</span>
      <ThermalFill
        value={selectedText.backgroundColor || "transparent"}
        ariaLabel={$tr("params.fill.background")}
        options={[
          { value: "transparent", label: $tr("params.color.transparent") },
          { value: "white", label: $tr("params.color.white") },
          { value: "black", label: $tr("params.color.black") },
        ]}
        onChange={(v) => backgroundColorChanged(v)} />
    </div>
  </div>
</BottomSheet>

{#if selectedText instanceof fabric.Textbox}
  <div class="tool-cell">
    <SegmentedButton
      ariaLabel={$tr("params.params.text.split")}
      value={selectedText.splitByGrapheme ? "grapheme" : "space"}
      options={[
        { value: "space", label: $tr("params.params.text.split.spaces") },
        { value: "grapheme", label: $tr("params.params.text.split.grapheme") },
      ]}
      onChange={(v) => splitChanged(v)} />
  </div>
{/if}

{#if selectedText instanceof TextboxExt}
  <!-- fixme: Custom property not auto-rendered for some reason -->
  <div class="tool-action" data-ver={editRevision}>
    <Switch
      ariaLabel={$tr("params.text.autosize")}
      checked={selectedText.fontAutoSize}
      onChange={toggleFontAutoSize} />
  </div>
{/if}


<div class="tool-cell font-size">
  <TextField
    type="number"
    leadingIcon="format_size"
    ariaLabel={$tr("params.text.font_size")}
    min={sizeMin}
    max={sizeMax}
    value={selectedText.fontSize}
    onChange={(v) => fontSizeChange(parseFloat(v))} />
  <Button
    variant="tonal"
    icon="text_increase"
    ariaLabel={$tr("params.text.font_size.up")}
    onclick={fontSizeUp} />
  <Button
    variant="tonal"
    icon="text_decrease"
    ariaLabel={$tr("params.text.font_size.down")}
    onclick={fontSizeDown} />
</div>

<div class="tool-cell line-height">
  <TextField
    type="number"
    leadingIcon="density_medium"
    ariaLabel={$tr("params.text.line_height")}
    min={0.1}
    max={10}
    value={selectedText.lineHeight}
    onChange={(v) => lineHeightChange(parseFloat(v))} />
</div>

<FontFamilyPicker {editRevision} value={selectedText.fontFamily} valueUpdated={updateFontFamily} />

<Button variant="tonal" icon="edit" ariaLabel={$tr("params.text.edit")} onclick={editInPopup}>
  {$tr("params.text.edit")}
</Button>

<style>
  .tool-cell.font-size {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    width: 16em;
  }
  .tool-cell.line-height {
    width: 8em;
  }
</style>
