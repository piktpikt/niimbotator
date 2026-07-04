<script lang="ts" module>
  // PIKT: M3 bottom sheet (deep restyle). Wraps `svelte-bottom-sheet` in the project's M3 chrome
  // (28dp top corners, drag grip, title bar + close) and adds a module-level registry so the
  // editor can (a) dismiss any open sheet on canvas tap — replaces `new Dropdown(...).hide()` —
  // and (b) ask "is a sheet open?" from the paste-guard — replaces the `.dropdown-menu.show`
  // DOM probe. See editor restyle phases 4-5.
  import { writable } from "svelte/store";

  const closers = new Set<() => void>();
  const openTokens = new Set<symbol>();

  /** Reactive: true while at least one BottomSheet is open. */
  export const anySheetOpen = writable(false);
  const sync = () => anySheetOpen.set(openTokens.size > 0);

  /** Imperatively close every open BottomSheet (e.g. on canvas tap). */
  export function closeAllSheets(): void {
    for (const close of [...closers]) close();
  }
</script>

<script lang="ts">
  import { BottomSheet as Sheet } from "svelte-bottom-sheet";
  import { onDestroy, type Snippet } from "svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    open: boolean;
    title?: string;
    onClose?: () => void;
    children: Snippet;
    /** Optional inline trigger; usually the sheet is opened by binding `open`. */
    trigger?: Snippet;
  }

  let { open = $bindable(), title, onClose, children, trigger }: Props = $props();

  const token = Symbol();
  const close = () => (open = false);
  closers.add(close);

  $effect(() => {
    if (open) openTokens.add(token);
    else openTokens.delete(token);
    sync();
  });

  onDestroy(() => {
    closers.delete(close);
    openTokens.delete(token);
    sync();
  });
</script>

<Sheet bind:isSheetOpen={open} onclose={() => onClose?.()} settings={{ position: "bottom", maxHeight: 0.9 }}>
  {#if trigger}
    <Sheet.Trigger>{@render trigger()}</Sheet.Trigger>
  {/if}
  <Sheet.Overlay>
    <Sheet.Sheet>
      <div
        class="mx-auto flex w-full max-w-xl flex-col rounded-t-m3-xl bg-surface-100-900 text-surface-950-50 shadow-e3">
        <Sheet.Handle>
          <div class="flex cursor-grab justify-center py-3 active:cursor-grabbing">
            <span class="h-1 w-9 rounded-full bg-surface-400-600"></span>
          </div>
        </Sheet.Handle>

        {#if title}
          <header class="flex items-center justify-between gap-2 px-4 pb-2">
            <h2 class="text-title-large">{title}</h2>
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
        {/if}

        <div class="max-h-[80dvh] overflow-y-auto px-4 pb-6">
          {@render children()}
        </div>
      </div>
    </Sheet.Sheet>
  </Sheet.Overlay>
</Sheet>
