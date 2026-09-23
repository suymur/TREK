import { idSchema } from '../common/primitives.schema';
import { COST_CATEGORIES, type CostCategory } from './budget.schema';

import { z } from 'zod';

/**
 * Cost overview contract — GET /api/costs/overview (#2).
 *
 * One row per trip the caller can access (owner or member), newest first, with
 * the trip total in the trip's base currency and the same total converted into
 * one display currency (the caller's default currency). The global figures are
 * sums of the per-trip display figures, so the global total always equals the
 * sum of the trip rows the page prints. Every total splits by cost category;
 * the category figures sum to their total exactly (whole cents).
 *
 * Answers 403 `{ error: 'Costs addon is not enabled' }` while the admin has the
 * Costs addon switched off.
 */

/**
 * Free-text categories from before the fixed Costs categories (and reservation
 * type labels such as "Flight" or "Train") mapped to the fixed keys.
 */
const LEGACY_CATEGORY_MAP: Record<string, CostCategory> = {
  flight: 'flights',
  flights: 'flights',
  plane: 'flights',
  flug: 'flights',
  train: 'transport',
  bus: 'transport',
  car: 'transport',
  'car rental': 'transport',
  ferry: 'transport',
  boat: 'transport',
  taxi: 'transport',
  transfer: 'transport',
  transport: 'transport',
  transportation: 'transport',
  hotel: 'accommodation',
  accommodation: 'accommodation',
  lodging: 'accommodation',
  hostel: 'accommodation',
  restaurant: 'food',
  food: 'food',
  dining: 'food',
  meal: 'food',
  meals: 'food',
  grocery: 'groceries',
  groceries: 'groceries',
  activity: 'activities',
  activities: 'activities',
  sightseeing: 'sightseeing',
  sights: 'sightseeing',
  shop: 'shopping',
  shopping: 'shopping',
  fee: 'fees',
  fees: 'fees',
  health: 'health',
  medical: 'health',
  tip: 'tips',
  tips: 'tips',
  gas: 'fuel',
  fuel: 'fuel',
  petrol: 'fuel',
  parking: 'parking',
  parkings: 'parking',
  'car park': 'parking',
  other: 'other',
  misc: 'other',
};

const COST_CATEGORY_SET: ReadonlySet<string> = new Set(COST_CATEGORIES);

/**
 * The one place a stored `budget_items.category` becomes a category key. The
 * Costs tab and the cross-trip overview both group by it, so an expense lands in
 * the same bucket on both screens. Unknown and empty values are `other`.
 */
export function resolveCostCategory(category: string | null | undefined): CostCategory {
  if (!category) return 'other';
  if (COST_CATEGORY_SET.has(category)) return category as CostCategory;
  return LEGACY_CATEGORY_MAP[category.trim().toLowerCase()] ?? 'other';
}

const costCategorySchema = z.enum(COST_CATEGORIES);

/** One category of one trip: the amount in the trip currency and in the display currency. */
export const costsOverviewTripCategorySchema = z.object({
  category: costCategorySchema,
  total: z.number(),
  /** null when no exchange rate from the trip currency to the display currency was available. */
  display_total: z.number().nullable(),
});
export type CostsOverviewTripCategory = z.infer<typeof costsOverviewTripCategorySchema>;

export const costsOverviewTripSchema = z.object({
  trip_id: idSchema,
  title: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  /** The trip's base currency; `total` and each category `total` are in it. */
  currency: z.string(),
  is_archived: z.boolean(),
  item_count: z.number().int().nonnegative(),
  total: z.number(),
  /** `total` in the display currency; null when no exchange rate was available. */
  display_total: z.number().nullable(),
  /** Categories with at least one expense, in COST_CATEGORIES order. */
  categories: z.array(costsOverviewTripCategorySchema),
  /**
   * Still to be paid on this trip, in the trip currency: the open amount of
   * every expense split into installments (#6). Expenses without installments
   * count as paid, so a trip without installments has 0.
   */
  open_total: z.number(),
  /** `open_total` in the display currency; null when no exchange rate was available. */
  display_open_total: z.number().nullable(),
});
export type CostsOverviewTrip = z.infer<typeof costsOverviewTripSchema>;

/** One category across all trips, in the display currency. */
export const costsOverviewCategoryTotalSchema = z.object({
  category: costCategorySchema,
  total: z.number(),
});
export type CostsOverviewCategoryTotal = z.infer<typeof costsOverviewCategoryTotalSchema>;

export const costsOverviewResponseSchema = z.object({
  /** The display currency every `display_total` and the global figures are in. */
  currency: z.string(),
  trips: z.array(costsOverviewTripSchema),
  /** Sum of every trip `display_total`; trips without a rate are left out. */
  total: z.number(),
  categories: z.array(costsOverviewCategoryTotalSchema),
  /** Sum of every trip `display_open_total`; trips without a rate are left out. */
  open_total: z.number(),
  /** Trips whose total could not be converted and is missing from the global figures. */
  unconverted_trip_ids: z.array(idSchema),
});
export type CostsOverviewResponse = z.infer<typeof costsOverviewResponseSchema>;
