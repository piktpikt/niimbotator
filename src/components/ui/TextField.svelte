<script lang="ts">
  // PIKT: M3 outlined text field (deep restyle). Replaces Bootstrap form-control/input-group
  // across the editor param panels. Outline at rest, primary on focus, optional leading label,
  // optional leading icon (M3 text-field affordance), and an optional multiline (textarea) mode.
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { IconName } from "$/styles/icon_data";

  interface Props {
    value: string | number;
    label?: string;
    type?: "text" | "number";
    placeholder?: string;
    inputmode?: "text" | "numeric" | "decimal";
    min?: number;
    max?: number;
    leadingIcon?: IconName;
    multiline?: boolean;
    rows?: number;
    disabled?: boolean;
    ariaLabel?: string;
    onChange: (v: string) => void;
  }

  let {
    value,
    label,
    type = "text",
    placeholder,
    inputmode,
    min,
    max,
    leadingIcon,
    multiline = false,
    rows = 3,
    disabled = false,
    ariaLabel,
    onChange,
  }: Props = $props();

  const fieldBase =
    "w-full rounded-m3-sm border border-surface-400-600 bg-surface-100-900 text-body-large text-surface-950-50 outline-none transition-colors placeholder:text-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 disabled:opacity-40";
</script>

<label class="flex w-full flex-col gap-1.5">
  {#if label}<span class="text-label-medium text-surface-600-400">{label}</span>{/if}
  <div class="relative flex w-full items-center">
    {#if leadingIcon && !multiline}
      <span class="pointer-events-none absolute left-3 z-10 text-surface-600-400"><MdIcon icon={leadingIcon} /></span>
    {/if}
    {#if multiline}
      <textarea
        {placeholder}
        {rows}
        {disabled}
        aria-label={ariaLabel ?? label}
        {value}
        oninput={(e) => onChange(e.currentTarget.value)}
        class="{fieldBase} resize-y px-3 py-2 leading-normal"></textarea>
    {:else}
      <input
        {type}
        {placeholder}
        {inputmode}
        {min}
        {max}
        {value}
        {disabled}
        aria-label={ariaLabel ?? label}
        oninput={(e) => onChange(e.currentTarget.value)}
        class="{fieldBase} h-12 {leadingIcon ? 'pl-10' : 'pl-3'} pr-3" />
    {/if}
  </div>
</label>
