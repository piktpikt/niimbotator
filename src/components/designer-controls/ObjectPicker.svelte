<script lang="ts">
  // PIKT: deep restyle — Bootstrap dropdown → M3 ui/BottomSheet + ui/Button (editor phase 5).
  // Upstream PR candidate: no
  import { type LabelProps, type OjectType } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ZplImportButton from "$/components/designer-controls/ZplImportButton.svelte";
  import PdfImportButton from "$/components/designer-controls/PdfImportButton.svelte";
  import Button from "$/components/ui/Button.svelte";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";

  interface Props {
    onSubmit: (i: OjectType) => void;
    labelProps: LabelProps;
    zplImageReady: (img: Blob) => void;
    pdfImageReady: (img: HTMLCanvasElement) => void;
  }

  let { onSubmit, labelProps, zplImageReady, pdfImageReady }: Props = $props();

  let open = $state(false);
</script>

<button class="tool-cell" onclick={() => (open = true)}>
  <MdIcon icon="add" /><span>{$tr("editor.toolbar.more")}</span>
</button>

<BottomSheet bind:open title={$tr("editor.objectpicker.title")}>
  <Button variant="text" icon="title" onclick={() => { onSubmit("text"); open = false; }}>
    {$tr("editor.objectpicker.text")}
  </Button>
  <Button variant="text" icon="remove" onclick={() => { onSubmit("line"); open = false; }}>
    {$tr("editor.objectpicker.line")}
  </Button>
  <Button variant="text" icon="crop_square" onclick={() => { onSubmit("rectangle"); open = false; }}>
    {$tr("editor.objectpicker.rectangle")}
  </Button>
  <Button variant="text" icon="radio_button_unchecked" onclick={() => { onSubmit("circle"); open = false; }}>
    {$tr("editor.objectpicker.circle")}
  </Button>
  <Button variant="text" icon="image" onclick={() => { onSubmit("image"); open = false; }}>
    {$tr("editor.objectpicker.image")}
  </Button>
  <Button variant="text" icon="qr_code_2" onclick={() => { onSubmit("qrcode"); open = false; }}>
    {$tr("editor.objectpicker.qrcode")}
  </Button>
  <Button variant="text" icon="grid_on" onclick={() => { onSubmit("aruco"); open = false; }}>
    {$tr("editor.objectpicker.aruco")}
  </Button>
  <Button variant="text" icon="view_week" onclick={() => { onSubmit("barcode"); open = false; }}>
    {$tr("editor.objectpicker.barcode")}
  </Button>

  <ZplImportButton {labelProps} onImageReady={zplImageReady} />

  <PdfImportButton {labelProps} onImageReady={pdfImageReady} />
</BottomSheet>
