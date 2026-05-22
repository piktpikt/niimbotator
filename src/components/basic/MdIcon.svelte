<script lang="ts">
  // PIKT: rewrapped over offline Iconify Material Symbols (Chantier 0). Icon data is bundled in
  // icon_data.ts (no Iconify API at runtime — the app is fully offline). Public API kept stable:
  // { icon, class } plus the `.r-90` rotation helper, so existing call sites are unchanged.
  import Icon from "@iconify/svelte";
  import { ICON_DATA, type IconName } from "$/styles/icon_data";

  interface Props {
    icon: IconName;
    class?: string;
  }

  let { icon, class: className = "" }: Props = $props();
</script>

<span class="mdi {className}">
  <Icon icon={ICON_DATA[icon]} width="1.5em" height="1.5em" />
</span>

<style>
  .mdi {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: -0.24em;
    line-height: 1;
  }
  .mdi.r-90 {
    transform: rotate(90deg);
  }
</style>
