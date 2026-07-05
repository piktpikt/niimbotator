<script lang="ts">
  // PIKT: deep restyle — "Formes" tool tile (replaces the single Rectangle tile). Opens a Word-like
  // shape gallery in an M3 BottomSheet; every option previews the actual shape as an inline SVG, so it
  // needs no entry in the curated MdIcon subset. All shapes are native Fabric primitives.
  import { type OjectType } from "$/types";
  import { tr } from "$/utils/i18n";
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
  <span class="tile-chip tile-violet">
    <svg viewBox="0 0 32 32" class="size-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round">
      <rect x="3.5" y="13" width="14" height="14" rx="2" />
      <circle cx="22" cy="10" r="7.5" />
    </svg>
  </span>
  <span>{$tr("editor.shapes.title")}</span>
</button>

<BottomSheet bind:open title={$tr("editor.shapes.title")}>
  <div class="grid grid-cols-4 gap-1">
    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("rectangle")}>
      <svg viewBox="0 0 32 32" class="size-8 text-surface-900-100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <rect x="4" y="8" width="24" height="16" />
      </svg>
      <span>{$tr("editor.shapes.rectangle")}</span>
    </button>

    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("rounded_rect")}>
      <svg viewBox="0 0 32 32" class="size-8 text-surface-900-100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <rect x="4" y="8" width="24" height="16" rx="5" />
      </svg>
      <span>{$tr("editor.shapes.rounded_rect")}</span>
    </button>

    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("circle")}>
      <svg viewBox="0 0 32 32" class="size-8 text-surface-900-100" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="16" cy="16" r="12" />
      </svg>
      <span>{$tr("editor.shapes.circle")}</span>
    </button>

    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("ellipse")}>
      <svg viewBox="0 0 32 32" class="size-8 text-surface-900-100" fill="none" stroke="currentColor" stroke-width="2.2">
        <ellipse cx="16" cy="16" rx="13" ry="9" />
      </svg>
      <span>{$tr("editor.shapes.ellipse")}</span>
    </button>

    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("triangle")}>
      <svg viewBox="0 0 32 32" class="size-8 text-surface-900-100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <path d="M16 4 L28 27 L4 27 Z" />
      </svg>
      <span>{$tr("editor.shapes.triangle")}</span>
    </button>

    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("line")}>
      <svg viewBox="0 0 32 32" class="size-8 text-surface-900-100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="5" y1="26" x2="27" y2="6" />
      </svg>
      <span>{$tr("editor.shapes.line")}</span>
    </button>

    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("arrow")}>
      <svg viewBox="0 0 32 32" class="size-8 text-surface-900-100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <path d="M4 12 H19 V7 L28 16 L19 25 V20 H4 Z" />
      </svg>
      <span>{$tr("editor.shapes.arrow")}</span>
    </button>

    <button class="flex flex-col items-center gap-1 rounded-xl p-3 text-xs text-surface-700-300 transition-colors hover:bg-surface-200-800" onclick={() => pick("star")}>
      <svg viewBox="0 0 32 32" class="size-8 text-surface-900-100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <path d="M16 3 L19.2 11.6 L28.4 12 L21.2 17.7 L23.6 26.5 L16 21.5 L8.4 26.5 L10.8 17.7 L3.6 12 L12.8 11.6 Z" />
      </svg>
      <span>{$tr("editor.shapes.star")}</span>
    </button>
  </div>
</BottomSheet>
