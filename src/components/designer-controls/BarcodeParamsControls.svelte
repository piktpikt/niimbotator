<script lang="ts">
  // PIKT: deep restyle — Bootstrap form controls → M3 ui/* primitives; printText toggle → Switch (editor phase 2).
  // Upstream PR candidate: no
  import { Barcode } from "$/fabric-object/barcode";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import SegmentedButton from "$/components/ui/SegmentedButton.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import Switch from "$/components/ui/Switch.svelte";

  interface Props {
    selectedBarcode: Barcode;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedBarcode, editRevision, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision}>

<div class="flex items-center gap-1" title={$tr("params.barcode.encoding")}>
  <MdIcon icon="code" />
  <SegmentedButton
    ariaLabel={$tr("params.barcode.encoding")}
    value={selectedBarcode.encoding}
    options={[
      { value: "EAN13", label: "EAN13" },
      { value: "CODE128B", label: "Code128 B" },
    ]}
    onChange={(v) => {
      selectedBarcode?.set("encoding", v ?? "EAN13");
      valueUpdated();
    }} />
</div>

<div class="w-24" title={$tr("params.barcode.scale")}>
  <TextField
    type="number"
    min={1}
    inputmode="numeric"
    leadingIcon="settings_ethernet"
    ariaLabel={$tr("params.barcode.scale")}
    value={selectedBarcode.scaleFactor}
    onChange={(v) => {
      const n = Number(v);
      selectedBarcode?.set("scaleFactor", Number.isFinite(n) ? n : 1);
      valueUpdated();
    }} />
</div>

<div class="flex items-center gap-2" title={$tr("params.barcode.enable_caption")}>
  <Switch
    checked={selectedBarcode.printText}
    ariaLabel={$tr("params.barcode.enable_caption")}
    onChange={(v) => {
      selectedBarcode?.set("printText", v);
      valueUpdated();
    }} />
  <span class="text-label-medium text-surface-600-400">123</span>
</div>

<div class="w-24" title={$tr("params.barcode.font_size")}>
  <TextField
    type="number"
    min={1}
    inputmode="numeric"
    leadingIcon="format_size"
    ariaLabel={$tr("params.barcode.font_size")}
    value={selectedBarcode.fontSize}
    onChange={(v) => {
      const n = Number(v);
      selectedBarcode?.set("fontSize", Number.isFinite(n) ? n : 12);
      valueUpdated();
    }} />
</div>

<TextField
  multiline
  rows={4}
  value={selectedBarcode.text}
  onChange={(v) => {
    selectedBarcode?.set("text", v);
    valueUpdated();
  }} />
