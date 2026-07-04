<script lang="ts">
  // PIKT: M3 outlined select (deep restyle). A native <select> dressed in the same outlined
  // treatment as TextField — replaces Bootstrap form-select for option sets too long for a
  // SegmentedButton (QR mode/version, vector fill, …). Native element, so no JS dependency:
  // keyboard/scroll/overlay come from the platform. onChange returns the raw string value; the
  // caller coerces (parseInt/parseFloat) exactly as the old Bootstrap onchange handlers did.
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { IconName } from "$/styles/icon_data";

  interface Option {
    value: string | number;
    label: string;
  }
  interface Props {
    value: string | number;
    options: Option[];
    label?: string;
    leadingIcon?: IconName;
    ariaLabel?: string;
    disabled?: boolean;
    onChange: (v: string) => void;
  }

  let { value, options, label, leadingIcon, ariaLabel, disabled = false, onChange }: Props = $props();
</script>

<label class="flex w-full flex-col gap-1.5">
  {#if label}<span class="text-label-medium text-surface-600-400">{label}</span>{/if}
  <div class="relative flex w-full items-center">
    {#if leadingIcon}
      <span class="pointer-events-none absolute left-3 z-10 text-surface-600-400"><MdIcon icon={leadingIcon} /></span>
    {/if}
    <select
      {value}
      {disabled}
      aria-label={ariaLabel ?? label}
      onchange={(e) => onChange(e.currentTarget.value)}
      class="h-12 w-full appearance-none rounded-m3-sm border border-surface-400-600 bg-surface-100-900 text-body-large text-surface-950-50 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 disabled:opacity-40 {leadingIcon
        ? 'pl-10'
        : 'pl-3'} pr-9">
      {#each options as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
    <span class="pointer-events-none absolute right-2 z-10 text-surface-600-400"><MdIcon icon="expand_more" /></span>
  </div>
</label>
