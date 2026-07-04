<script lang="ts">
  // PIKT: M3 outlined text field (deep restyle). Replaces Bootstrap form-control/input-group
  // across the editor param panels. Outline at rest, primary on focus, optional leading label.
  interface Props {
    value: string | number;
    label?: string;
    type?: "text" | "number";
    placeholder?: string;
    inputmode?: "text" | "numeric" | "decimal";
    min?: number;
    max?: number;
    ariaLabel?: string;
    onChange: (v: string) => void;
  }

  let { value, label, type = "text", placeholder, inputmode, min, max, ariaLabel, onChange }: Props = $props();
</script>

<label class="flex w-full flex-col gap-1.5">
  {#if label}<span class="text-label-medium text-surface-600-400">{label}</span>{/if}
  <input
    {type}
    {placeholder}
    {inputmode}
    {min}
    {max}
    {value}
    aria-label={ariaLabel ?? label}
    oninput={(e) => onChange(e.currentTarget.value)}
    class="h-12 rounded-m3-sm border border-surface-400-600 bg-surface-100-900 px-3 text-body-large text-surface-950-50 outline-none transition-colors placeholder:text-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25" />
</label>
