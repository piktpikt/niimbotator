// PIKT: store-based page navigation (no router dependency, per the approved stack). (Chantier 0)
import { writable } from "svelte/store";

export type Page = "home" | "editor" | "batches" | "library" | "settings";

/** The currently displayed top-level page. */
export const currentPage = writable<Page>("home");

export function navigate(page: Page): void {
  currentPage.set(page);
}
