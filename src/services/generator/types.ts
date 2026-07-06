import { z } from "zod";

/**
 * A slot's semantic purpose within an archetype layout.
 * Prefixes: text.* (typography), i.* (image), d.* (decoration/shape), f.* (functional code objects, Phase 4).
 */
export type Role =
  | "text.title"
  | "text.name"
  | "text.price"
  | "text.date"
  | "text.body"
  | "text.legal"
  | "text.caption"
  | "text.contact"
  | "i.hero"
  | "i.background"
  | "d.accent"
  | "d.corner"
  | "d.separator"
  | "d.frame"
  | "highlight-band"
  | "f.qr"
  | "f.barcode"
  | "f.date"
  | "f.serial";

export const ROLES: Role[] = [
  "text.title",
  "text.name",
  "text.price",
  "text.date",
  "text.body",
  "text.legal",
  "text.caption",
  "text.contact",
  "i.hero",
  "i.background",
  "d.accent",
  "d.corner",
  "d.separator",
  "d.frame",
  "highlight-band",
  "f.qr",
  "f.barcode",
  "f.date",
  "f.serial",
];

/** A single placement within an {@link Archetype} layout, expressed as fractions of the label bounds. */
export interface Slot {
  role: Role;
  /** [x, y, w, h] fractions of W×H (0..1), relative to the label bounds. */
  rect: [number, number, number, number];
  align?: "left" | "center" | "right";
  /** Stack order (frame/background low, text high). */
  z?: number;
  /** For tiled roles (e.g. d.accent icon border): "perimeter" = tile around the border, or a fixed count. */
  repeat?: "perimeter" | number;
}

/** A hand-authored layout: a named set of slots. ~24 archetypes total (Phase 3 target). */
export interface Archetype {
  id: string;
  slots: Slot[];
}

/** A category's content recipe: which archetype to use, default text, variables, icon keywords, and font vibe. */
export interface CategoryRecipe {
  category: string;
  archetypeId: string;
  labelFr: string;
  labelEn: string;
  defaults: Partial<Record<Role, string>>;
  variables: string[];
  iconKeywords: string[];
  fontVibe: "festive" | "retail" | "premium" | "clean" | "handmade" | "accessibility";
  /** Optional per-role target size in millimeters (hero >= 12, title 7-11, body 4-6, small < 4). */
  textSizesMm?: Partial<Record<Role, number>>;
}

/** A slot's placement resolved to pixels within the label bounds. */
export interface PxBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Headless, Fabric-free description of an object to materialize for a filled slot. */
export type ObjectDescriptor =
  | { kind: "text"; role: Role; text: string; box: PxBox; sizePx: number; align: "left" | "center" | "right" }
  | { kind: "icon"; role: Role; keywords: string[]; box: PxBox; repeat?: "perimeter" | number }
  | { kind: "shape"; role: Role; shape: "rect" | "line" | "band"; box: PxBox };

// --- Zod schemas (runtime validation of build-time JSON/TS data) ---
// Hand-written to mirror the interfaces above exactly (z.infer would not round-trip the
// literal-tuple / union shapes faithfully), so keep both in sync on any interface change.

const RoleSchema = z.enum(ROLES as [Role, ...Role[]]);

const AlignSchema = z.enum(["left", "center", "right"]);

const FractionSchema = z.number().min(0).max(1);

const SlotSchema = z.object({
  role: RoleSchema,
  rect: z.tuple([FractionSchema, FractionSchema, FractionSchema, FractionSchema]),
  align: AlignSchema.optional(),
  z: z.number().optional(),
  repeat: z.union([z.literal("perimeter"), z.number()]).optional(),
}) satisfies z.ZodType<Slot>;

export const ArchetypeSchema = z.object({
  id: z.string(),
  slots: z.array(SlotSchema),
}) satisfies z.ZodType<Archetype>;

const FontVibeSchema = z.enum(["festive", "retail", "premium", "clean", "handmade", "accessibility"]);

export const CategoryRecipeSchema = z.object({
  category: z.string(),
  archetypeId: z.string(),
  labelFr: z.string(),
  labelEn: z.string(),
  defaults: z.partialRecord(RoleSchema, z.string()) satisfies z.ZodType<Partial<Record<Role, string>>>,
  variables: z.array(z.string()),
  iconKeywords: z.array(z.string()),
  fontVibe: FontVibeSchema,
  textSizesMm: z.partialRecord(RoleSchema, z.number()).optional() satisfies z.ZodType<
    Partial<Record<Role, number>> | undefined
  >,
}) satisfies z.ZodType<CategoryRecipe>;
