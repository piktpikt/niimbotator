<script lang="ts">
  // PIKT: deep restyle — Bootstrap form-select/form-control → M3 ui/* primitives (editor phase 2).
  // Upstream PR candidate: no
  import { QRCode } from "$/fabric-object/qrcode";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import SegmentedButton from "$/components/ui/SegmentedButton.svelte";
  import Select from "$/components/ui/Select.svelte";
  import TextField from "$/components/ui/TextField.svelte";

  interface Props {
    selectedQRCode: QRCode;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedQRCode, editRevision, valueUpdated }: Props = $props();

  const eclOptions = [
    { value: "L", label: "L" },
    { value: "M", label: "M" },
    { value: "Q", label: "Q" },
    { value: "H", label: "H" },
  ];

  const modeOptions = [
    { value: "Byte", label: "Byte" },
    { value: "Numeric", label: "Numeric" },
    { value: "Alphanumeric", label: "Alphanumeric" },
    { value: "Kanji", label: "Kanji" },
  ];

  const versionOptions = [
    { value: 0, label: "Auto" },
    ...Array.from({ length: 40 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
  ];
</script>

<input type="hidden" value={editRevision}>

<div class="flex w-full items-center gap-2">
  <MdIcon icon="auto_fix_high" />
  <SegmentedButton
    options={eclOptions}
    value={selectedQRCode.ecl}
    ariaLabel={$tr("params.qrcode.ecl")}
    onChange={(v) => {
      selectedQRCode?.set("ecl", v);
      valueUpdated();
    }} />
</div>

<Select
  options={modeOptions}
  value={selectedQRCode.mode}
  leadingIcon="abc"
  ariaLabel={$tr("params.qrcode.mode")}
  onChange={(v) => {
    selectedQRCode?.set("mode", v);
    valueUpdated();
  }} />

<Select
  options={versionOptions}
  value={selectedQRCode.qrVersion}
  leadingIcon="123"
  ariaLabel={$tr("params.qrcode.version")}
  onChange={(v) => {
    selectedQRCode?.set("qrVersion", parseInt(v));
    valueUpdated();
  }} />

<TextField
  multiline
  rows={4}
  value={selectedQRCode.text}
  onChange={(v) => {
    selectedQRCode?.set("text", v);
    valueUpdated();
  }} />
