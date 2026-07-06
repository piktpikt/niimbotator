import { DEFAULT_DPMM } from "$/defaults";
import type { LabelProps } from "$/types";
import { archetypeById } from "./archetypes";
import { fillSlot } from "./fillSlot";
import type { CategoryRecipe, ObjectDescriptor } from "./types";

/**
 * Pure, Fabric-free planning step: resolve a {@link CategoryRecipe} + variables + {@link LabelProps}
 * into an ordered list of {@link ObjectDescriptor}s ready for materialization by `generate.ts`.
 *
 * Phase 1 bounds = the full label (startX/startY = 0, width/height = labelProps.size). Tail-aware
 * and split-aware bounds (accounting for `LabelProps.tailLength`/`split`) are deferred to a later phase.
 *
 * Returns an empty array if `recipe.archetypeId` does not resolve to a known {@link Archetype}.
 */
export function planLabel(
  recipe: CategoryRecipe,
  variables: Record<string, string>,
  labelProps: LabelProps
): ObjectDescriptor[] {
  const archetype = archetypeById(recipe.archetypeId);
  if (!archetype) return [];

  const bounds = { startX: 0, startY: 0, width: labelProps.size.width, height: labelProps.size.height };
  const dpmm = labelProps.size.dpmm ?? DEFAULT_DPMM;

  // Sort ascending by z so frames/backgrounds (low z) are filled before text/foreground (high z) —
  // callers add descriptors to the canvas in array order, so this controls stacking.
  const slots = [...archetype.slots].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return slots
    .map((slot) => fillSlot(slot, recipe, variables, bounds, dpmm))
    .filter((descriptor): descriptor is ObjectDescriptor => descriptor !== null);
}
