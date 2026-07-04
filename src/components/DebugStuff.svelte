<script lang="ts">
  // PIKT: deep restyle — Bootstrap (AppModal + btn/form/input-group) → M3 Dialog + primitives (editor phase 5 finalize). Upstream PR candidate: no
  import Dialog from "$/components/ui/Dialog.svelte";
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import { appConfig } from "$/stores";
  import { tr } from "$/utils/i18n";
  import { NIIMBOT_CLIENT_DEFAULTS } from "@mmote/niimbluelib";

  let { show = $bindable() } = $props();
</script>

<Dialog bind:show title={$tr("debug.title")}>
  <div class="mb-1">
    {$tr("debug.packet_interval.help")}
  </div>

  <div class="mb-3 flex items-center gap-2">
    <TextField
      type="number"
      min={1}
      value={$appConfig.packetIntervalMs ?? ""}
      placeholder={`${NIIMBOT_CLIENT_DEFAULTS.packetIntervalMs}`}
      onChange={(v) => ($appConfig.packetIntervalMs = v === "" ? undefined : Number(v))} />
    <span class="text-label-medium text-surface-600-400">ms</span>
    <Button variant="outlined" onclick={() => ($appConfig.packetIntervalMs = undefined)}
      >{$tr("debug.reset")}</Button>
  </div>

  <div class="mb-1">
    {$tr("debug.page_delay.help")}
  </div>

  <div class="mb-3 flex items-center gap-2" role="group">
    <TextField
      type="number"
      min={0}
      value={$appConfig.pageDelay ?? ""}
      placeholder="0"
      onChange={(v) => ($appConfig.pageDelay = v === "" ? undefined : Number(v))} />
    <span class="text-label-medium text-surface-600-400">ms</span>
    <Button variant="outlined" onclick={() => ($appConfig.pageDelay = undefined)}>{$tr("debug.reset")}</Button>
  </div>
</Dialog>
