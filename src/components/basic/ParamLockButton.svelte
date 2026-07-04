<script lang="ts">
  // PIKT: deep restyle — Bootstrap btn → M3 ui/Button (editor phase 5 finalize). Upstream PR candidate: no
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import Button from "$/components/ui/Button.svelte";

  interface Props {
    propName: string;
    savedValue: any;
    value: any;
    onClick: (key: string, value: any) => void;
  }

  let {
    propName,
    savedValue,
    value,
    onClick
  }: Props = $props();
</script>

<span class="param-lock-btn">
  <Button variant="outlined" color="secondary" onclick={() => onClick(propName, value)}>
    {#if savedValue !== undefined}
      <MdIcon icon="lock" class="text-warning-500" />
    {:else}
      <MdIcon icon="lock_open" />
    {/if}
  </Button>
</span>
