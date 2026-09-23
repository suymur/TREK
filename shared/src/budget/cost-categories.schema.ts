import { idSchema } from '../common/primitives.schema';
import type { CostCategory } from './budget.schema';

import { z } from 'zod';

/**
 * Custom cost categories (#4) — /api/costs/categories.
 *
 * Instance-wide: every user sees the same list, so the cross-trip overview can
 * group by them. An expense in a custom category stores `custom:<id>` in
 * `budget_items.category`; the fixed keys (COST_CATEGORIES) stay unchanged. Any
 * signed-in user creates one; only its creator or an admin renames or deletes
 * it. Deleting a category moves its expenses to `other`.
 *
 * Ids come from an AUTOINCREMENT key and are never reused, so a stale
 * `custom:<id>` left in a cache can never point at a different category later.
 */

/** The prefix a custom category key carries in `budget_items.category`. */
export const CUSTOM_COST_CATEGORY_PREFIX = 'custom:';

/** `custom:<id>` — the stored key of a custom category. */
export type CustomCostCategoryKey = `custom:${number}`;

/** Any category key an expense can resolve to: a fixed key or a custom one. */
export type CostCategoryKey = CostCategory | CustomCostCategoryKey;

const CUSTOM_KEY_RE = /^custom:([1-9]\d{0,15})$/;

export function customCostCategoryKey(id: number): CustomCostCategoryKey {
  return `${CUSTOM_COST_CATEGORY_PREFIX}${id}` as CustomCostCategoryKey;
}

/** The id inside a well-formed `custom:<id>` key, or null for anything else. */
export function parseCustomCostCategoryId(key: string | null | undefined): number | null {
  if (!key) return null;
  const m = CUSTOM_KEY_RE.exec(key.trim());
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * The icons a custom category may use: lucide icon names. A short list on
 * purpose (the picker shows all of them at once); the client maps each name to
 * its lucide component.
 */
export const COST_CATEGORY_ICONS = [
  'tag',
  'briefcase',
  'landmark',
  'utensils-crossed',
  'coffee',
  'wine',
  'shirt',
  'gift',
  'sparkles',
  'palette',
  'music',
  'dumbbell',
  'baby',
  'dog',
  'wrench',
  'book-open',
  'home',
  'smartphone',
  'umbrella',
  'star',
] as const;
export type CostCategoryIcon = (typeof COST_CATEGORY_ICONS)[number];

/** The swatches the create dialog offers. The server accepts any `#rrggbb`. */
export const COST_CATEGORY_COLORS = [
  '#16a34a',
  '#65a30d',
  '#0d9488',
  '#0ea5e9',
  '#2563eb',
  '#4f46e5',
  '#9333ea',
  '#c026d3',
  '#db2777',
  '#e11d48',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#78716c',
  '#475569',
] as const;

export const COST_CATEGORY_NAME_MAX = 40;

const nameSchema = z.string().trim().min(1).max(COST_CATEGORY_NAME_MAX);
const iconSchema = z.enum(COST_CATEGORY_ICONS);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb colour');

/** A stored custom category, as every endpoint returns it. */
export const costCategoryRecordSchema = z.object({
  id: idSchema,
  name: z.string(),
  icon: iconSchema,
  color: z.string(),
  /** null once the creating user has been deleted. */
  created_by: idSchema.nullable(),
  created_at: z.string(),
  sort_order: z.number().int(),
});
export type CostCategoryRecord = z.infer<typeof costCategoryRecordSchema>;

export const costCategoryCreateRequestSchema = z.strictObject({
  name: nameSchema,
  icon: iconSchema,
  color: colorSchema,
});
export type CostCategoryCreateRequest = z.infer<typeof costCategoryCreateRequestSchema>;

export const costCategoryUpdateRequestSchema = z
  .strictObject({
    name: nameSchema.optional(),
    icon: iconSchema.optional(),
    color: colorSchema.optional(),
  })
  .refine((b) => b.name !== undefined || b.icon !== undefined || b.color !== undefined, {
    message: 'nothing to update',
  });
export type CostCategoryUpdateRequest = z.infer<typeof costCategoryUpdateRequestSchema>;

export const costCategoryListResponseSchema = z.object({
  categories: z.array(costCategoryRecordSchema),
});
export type CostCategoryListResponse = z.infer<typeof costCategoryListResponseSchema>;

export const costCategoryResponseSchema = z.object({
  category: costCategoryRecordSchema,
});
export type CostCategoryResponse = z.infer<typeof costCategoryResponseSchema>;

/** DELETE answers with how many expenses moved to `other`. */
export const costCategoryDeleteResponseSchema = z.object({
  success: z.literal(true),
  moved: z.number().int().nonnegative(),
});
export type CostCategoryDeleteResponse = z.infer<typeof costCategoryDeleteResponseSchema>;
