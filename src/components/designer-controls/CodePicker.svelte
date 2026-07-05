<script lang="ts">
  // PIKT: "Codes" tool tile — groups the machine-readable code objects (QR, barcode, ArUco), which are
  // variants of one "code" object, into a single BottomSheet picker (mirrors ShapePicker/Formes).
  import { type OjectType } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";

  interface Props {
    onSubmit: (t: OjectType) => void;
  }

  let { onSubmit }: Props = $props();

  let open = $state(false);

  const pick = (t: OjectType): void => {
    onSubmit(t);
    open = false;
  };
</script>

<button class="tool-cell" onclick={() => (open = true)}>
  <span class="tile-chip tile-coral"><MdIcon icon="qr_code_2" /></span><span>{$tr("editor.codes.title")}</span>
</button>

<BottomSheet bind:open title={$tr("editor.codes.title")}>
  <div class="grid grid-cols-3 gap-1">
    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("qrcode")}>
      <MdIcon icon="qr_code_2" class="text-2xl text-surface-900-100" />
      <span>{$tr("editor.objectpicker.qrcode")}</span>
    </button>
    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("barcode")}>
      <MdIcon icon="view_week" class="text-2xl text-surface-900-100" />
      <span>{$tr("editor.objectpicker.barcode")}</span>
    </button>
    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("aruco")}>
      <MdIcon icon="grid_on" class="text-2xl text-surface-900-100" />
      <span>{$tr("editor.objectpicker.aruco")}</span>
    </button>
  </div>
</BottomSheet>
