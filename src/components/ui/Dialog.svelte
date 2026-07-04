<script lang="ts">
  // PIKT: M3 dialog (deep restyle). Drop-in replacement for basic/AppModal — same public API
  // ({ show (bindable), title, onClose?, children, footer? } + imperative hide()) so PrintPreview /
  // FontsMenu / DebugStuff swap AppModal -> Dialog with no call-site churn, minus the Bootstrap
  // modal JS. Scrim + centered surface, Escape to close.
  import { type Snippet } from "svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    show: boolean;
    title: string;
    onClose?: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { show = $bindable(), title, onClose, children, footer }: Props = $props();

  const close = () => {
    if (!show) return;
    show = false;
    onClose?.();
  };

  /** Imperative close, matching AppModal.hide() (used by PrintPreview via bind:this). */
  export const hide = () => close();

  const onKeydown = (e: KeyboardEvent) => {
    if (show && e.key === "Escape") close();
  };
</script>

<svelte:window onkeydown={onKeydown} />

{#if show}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <button type="button" aria-label="Fermer" tabindex="-1" class="absolute inset-0 bg-black/50" onclick={close}
    ></button>

    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      class="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-m3-xl bg-surface-100-900 text-surface-950-50 shadow-e5">
      <header class="flex items-center justify-between gap-2 px-6 pt-5 pb-2">
        <h2 class="text-headline-small">{title}</h2>
        <button
          type="button"
          aria-label="Fermer"
          onclick={close}
          class="relative isolate flex size-11 items-center justify-center overflow-hidden rounded-full text-surface-600-400
            before:absolute before:inset-0 before:bg-current before:opacity-0 before:transition-opacity
            hover:before:opacity-[0.08] active:before:opacity-[0.12]">
          <MdIcon icon="close" />
        </button>
      </header>

      <div class="overflow-y-auto px-6 pb-4">
        {@render children()}
      </div>

      {#if footer}
        <footer class="flex flex-wrap justify-end gap-2 px-6 pt-2 pb-5">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </div>
{/if}
