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
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={ariaLabel}
  {disabled}
  onclick={() => onChange(!checked)}
  class="relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 transition-colors disabled:opacity-40
    {checked ? 'border-primary-500 bg-primary-500' : 'border-surface-400-600 bg-surface-200-800'}">
  <span
    class="absolute rounded-full transition-all
      {checked ? 'left-[22px] size-6 bg-primary-contrast-500' : 'left-1 size-4 bg-surface-500'}"></span>
</button>
