// PIKT: Shared open-state for the connection bottom sheet (Roadmap P2). The sheet is mounted once at
// the app root; the header connection chips (home TopAppBar + editor PrinterConnector) just toggle it.
import { writable } from "svelte/store";

export const printerSheetOpen = writable(false);

export function openPrinterSheet(): void {
  printerSheetOpen.set(true);
}
