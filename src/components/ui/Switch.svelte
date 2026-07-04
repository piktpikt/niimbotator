<script lang="ts">
  // PIKT: M3 switch (deep restyle). Replaces Bootstrap .form-check.form-switch (keep-aspect,
  // CSV enabled, caption toggles) with a themed, 48dp-hit-area switch.
  interface Props {
    checked: boolean;
    onChange: (v: boolean) => void;
    ariaLabel?: string;
    disabled?: boolean;
  }

  let { checked, onChange, ariaLabel, disabled = false }: Props = $props();

  // Optimistic toggle: when driven by a non-reactive source (a mutated Fabric prop), `checked`
  // doesn't re-evaluate on change, so reflect the click immediately and re-sync from `checked`
  // whenever it genuinely changes (e.g. a different object is selected). See ui/ThermalFill.
  let picked = $state<boolean | undefined>(undefined);
  const active = $derived(picked ?? checked);
  $effect(() => {
    void checked;
    picked = undefined;
  });
  function toggle(): void {
    const v = !active;
    picked = v;
    onChange(v);
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={active}
  aria-label={ariaLabel}
  {disabled}
  onclick={toggle}
  class="relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 transition-colors disabled:opacity-40
    {active ? 'border-primary-500 bg-primary-500' : 'border-surface-400-600 bg-surface-200-800'}">
  <span
    class="absolute rounded-full transition-all
      {active ? 'left-[22px] size-6 bg-primary-contrast-500' : 'left-1 size-4 bg-surface-500'}"></span>
</button>
