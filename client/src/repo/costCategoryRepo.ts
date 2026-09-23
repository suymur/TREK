import {
  costCategoryDeleteResponseSchema,
  costCategoryListResponseSchema,
  costCategoryResponseSchema,
  type CostCategoryCreateRequest,
  type CostCategoryRecord,
  type CostCategoryUpdateRequest,
} from '@trek/shared'
import { costCategoriesApi } from '../api/costCategories'
import { offlineDb } from '../db/offlineDb'
import { isEffectivelyOffline } from '../sync/networkMode'
import { onlineThenCache } from './withOfflineFallback'

/**
 * The custom cost categories (#4).
 *
 * Reads are offline-first: online, the list comes from the server and replaces
 * the cached copy (a category deleted elsewhere has to leave the cache too);
 * offline, the cached copy answers, so an expense in a custom category keeps
 * its name, icon and colour on a plane.
 *
 * Writes are **deliberately online-only.** The list is shared by every user of
 * the instance and an expense points at a category by its server id, so a
 * category made offline would need a temporary id that every queued expense
 * then had to be rewritten from. Creating, renaming and deleting a category
 * throws CostCategoryOfflineError before any request while offline; the
 * dialog tells the user to reconnect.
 */
export class CostCategoryOfflineError extends Error {
  constructor() {
    super('Custom categories can only be changed online')
    this.name = 'CostCategoryOfflineError'
  }
}

function requireOnline(): void {
  if (isEffectivelyOffline()) throw new CostCategoryOfflineError()
}

/** Replace the cached list with the server's, in one transaction. */
export async function cacheCostCategories(categories: CostCategoryRecord[]): Promise<void> {
  await offlineDb.transaction('rw', offlineDb.costCategories, async () => {
    await offlineDb.costCategories.clear()
    await offlineDb.costCategories.bulkPut(categories)
  })
}

const bySortOrder = (a: CostCategoryRecord, b: CostCategoryRecord) => a.sort_order - b.sort_order || a.id - b.id

export const costCategoryRepo = {
  async list(): Promise<CostCategoryRecord[]> {
    return onlineThenCache(
      async () => {
        const { categories } = costCategoryListResponseSchema.parse(await costCategoriesApi.list())
        await cacheCostCategories(categories)
        return categories
      },
      async () => (await offlineDb.costCategories.toArray()).sort(bySortOrder),
    )
  },

  async create(body: CostCategoryCreateRequest): Promise<CostCategoryRecord> {
    requireOnline()
    const { category } = costCategoryResponseSchema.parse(await costCategoriesApi.create(body))
    await offlineDb.costCategories.put(category)
    return category
  },

  async update(id: number, body: CostCategoryUpdateRequest): Promise<CostCategoryRecord> {
    requireOnline()
    const { category } = costCategoryResponseSchema.parse(await costCategoriesApi.update(id, body))
    await offlineDb.costCategories.put(category)
    return category
  },

  async remove(id: number): Promise<{ moved: number }> {
    requireOnline()
    const { moved } = costCategoryDeleteResponseSchema.parse(await costCategoriesApi.remove(id))
    await offlineDb.costCategories.delete(id)
    return { moved }
  },
}
