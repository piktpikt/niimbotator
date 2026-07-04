<script lang="ts">
  // PIKT: M3 Card primitive (deep restyle). Skeleton's `.card` is border-radius only; this adds the
  // three M3 card variants — elevated (shadow), filled (tonal), outlined — with M3 shape + a state
  // layer when interactive. Pass `onclick` to make the whole card a button.
  import type { Snippet } from "svelte";

  type Variant = "elevated" | "filled" | "outlined";

  interface Props {
    variant?: Variant;
    class?: string;
    ariaLabel?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  let { variant = "elevated", class: klass = "", ariaLabel, onclick, children }: Props = $props();

  const styles: Record<Variant, string> = {
    elevated: "bg-surface-100-900 shadow-e1",
    filled: "bg-surface-200-800",
    outlined: "border border-surface-300-700",
  };
  const base = $derived(`rounded-m3-md ${styles[variant]}`);
</script>

{#if onclick}
  <button
    type="button"
    aria-label={ariaLabel}
    {onclick}
    class="relative isolate block w-full overflow-hidden p-4 text-left transition active:scale-[0.99]
      before:absolute before:inset-0 before:bg-current before:opacity-0 before:transition-opacity before:content-['']
      hover:before:opacity-[0.06] active:before:opacity-[0.1]
      {base} {klass}">
    <span class="relative z-10 block">{@render children?.()}</span>
  </button>
{:else}
  <div class="p-4 {base} {klass}">{@render children?.()}</div>
{/if}
