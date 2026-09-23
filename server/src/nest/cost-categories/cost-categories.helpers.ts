import { customCostCategoryKey, parseCustomCostCategoryId } from '@trek/shared';

/**
 * The category an expense write stores (#4). A `custom:<id>` whose category
 * does not exist (deleted while an offline edit waited in the queue, or simply
 * wrong) is stored as `other`, the bucket every client shows it in anyway,
 * rather than refused: a refusal would strand a queued offline write. Anything
 * else passes through untouched, the legacy free text included.
 */
export function storedExpenseCategory<T extends string | null | undefined>(
  category: T,
  categoryExists: (id: number) => boolean,
): T | string {
  if (typeof category !== 'string') return category;
  const id = parseCustomCostCategoryId(category);
  if (id === null) return category;
  return categoryExists(id) ? customCostCategoryKey(id) : 'other';
}
