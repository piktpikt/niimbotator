<script lang="ts" generics="T extends string | number">
  // PIKT: M3 segmented button (deep restyle). Replaces the editor's btn-group toggle rows
  // (text align, print direction, origin) with a real single-select segmented control.
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { IconName } from "$/styles/icon_data";

  interface Option {
    value: T;
    label?: string;
    icon?: IconName;
    ariaLabel?: string;
  }
  interface Props {
    options: Option[];
    value: T;
    onChange: (v: T) => void;
    ariaLabel?: string;
  }

  let { options, value, onChange, ariaLabel }: Props = $props();

  // Optimistic selection: when driven by a non-reactive source (a mutated Fabric prop), the `value`
  // prop doesn't re-evaluate on change, so reflect the click immediately and re-sync from `value`
  // whenever it genuinely changes (e.g. a different object is selected). See ui/ThermalFill.
  let picked = $state<T | undefined>(undefined);
  const active = $derived(picked ?? value);
  $effect(() => {
    void value;
    picked = undefined;
  });
  function choose(v: T): void {
    picked = v;
    onChange(v);
  }
</script>

<div role="group" aria-label={ariaLabel} class="inline-flex w-full gap-1 rounded-m3-sm bg-surface-200-800 p-1">
  {#each options as opt (opt.value)}
    <button
      type="button"
      aria-pressed={active === opt.value}
      aria-label={opt.ariaLabel ?? opt.label}
      class="flex flex-1 items-center justify-center gap-1.5 rounded-m3-xs px-3 py-2 text-label-large transition
        {active === opt.value
          ? 'bg-primary-500 text-primary-contrast-500 shadow-e1'
          : 'text-surface-600-400 hover:bg-surface-300-700/40'}"
      onclick={() => choose(opt.value)}>
      {#if opt.icon}<MdIcon icon={opt.icon} />{/if}
      {#if opt.label}<span>{opt.label}</span>{/if}
    </button>
  {/each}
</div>
