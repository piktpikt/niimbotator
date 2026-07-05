<script lang="ts">
  // PIKT: renders the active confirmM3()/promptM3() request as an M3 Dialog. Mounted once at app
  // root (App.svelte) so any module can call confirmM3()/promptM3() without wiring a component.
  import Dialog from "$/components/ui/Dialog.svelte";
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import { tr } from "$/utils/i18n";
  import { dialogRequest } from "$/utils/confirm";

  const req = $derived($dialogRequest);
  let promptValue = $state("");

  $effect(() => {
    if (req?.kind === "prompt") promptValue = req.value;
  });

  function finish(result: boolean | string | null): void {
    const r = $dialogRequest;
    dialogRequest.set(null);
    r?.resolve(result as never);
  }
  const onConfirm = (): void => finish(req?.kind === "prompt" ? promptValue : true);
  const onCancel = (): void => finish(req?.kind === "prompt" ? null : false);
</script>

{#if req}
  <Dialog show={true} title={req.title ?? $tr("common.confirm.title")} onClose={onCancel}>
    <p class="text-body-large whitespace-pre-line text-surface-950-50">{req.message}</p>
    {#if req.kind === "prompt"}
      <div class="mt-4">
        <TextField value={promptValue} ariaLabel={req.message} onChange={(v) => (promptValue = v)} />
      </div>
    {/if}
    {#snippet footer()}
      <Button variant="text" color="secondary" onclick={onCancel}>{req.cancelLabel ?? $tr("common.cancel")}</Button>
      <Button
        variant="filled"
        color={req.kind === "confirm" && req.danger ? "error" : "primary"}
        onclick={onConfirm}>
        {req.confirmLabel ?? $tr("common.confirm")}
      </Button>
    {/snippet}
  </Dialog>
{/if}
