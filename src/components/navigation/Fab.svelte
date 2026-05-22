<script lang="ts">
  // PIKT: Floating action button (M3). Standard (icon only) or extended (icon + label). (Chantier 0)
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { IconName } from "$/styles/icon_data";

  interface Props {
    icon: IconName;
    label?: string;
    onclick?: () => void;
  }

  let { icon, label, onclick }: Props = $props();
</script>

<button
  type="button"
  {onclick}
  class="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-2xl bg-primary-500 text-primary-contrast-500 shadow-lg shadow-primary-500/30 transition-transform active:scale-95 {label
    ? 'px-5'
    : 'w-14 justify-center'}">
  <MdIcon icon={icon} />
  {#if label}<span class="font-semibold">{label}</span>{/if}
</button>
