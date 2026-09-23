import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { costCategoryRecordSchema, resolveCostCategory } from '@trek/shared'
import { addListener, removeListener } from '../../api/websocket'
import { useAuthStore } from '../../store/authStore'
import { useCostCategoryStore } from '../../store/costCategoryStore'
import { buildCostCategoryIndex, type CostCategoryIndex } from './costsCategories'

const remoteListSchema = z.object({ categories: z.array(costCategoryRecordSchema) })

/**
 * Apply a `costs:categories-changed` socket message (#4): the server sends the
 * full instance-wide list to every online user after any create, rename or
 * delete. Anything that does not parse is dropped; the next load corrects it.
 */
export function handleCostCategoryEvent(event: Record<string, unknown>): void {
  if (event.type !== 'costs:categories-changed') return
  const parsed = remoteListSchema.safeParse(event)
  if (parsed.success) useCostCategoryStore.getState().applyRemote(parsed.data.categories)
}

/**
 * Keep the custom categories current while a costs screen is mounted: read
 * them once on mount (server, else the offline cache) and apply the socket
 * pushes. Mount it once per screen (Costs tab, expense form, cost overview),
 * not in every row; the rows read the list with useCostCategoryIndex.
 */
export function useCostCategorySync(): void {
  useEffect(() => {
    useCostCategoryStore.getState().load()
    // A closure per mount: the socket keeps listeners in a Set, so sharing one
    // function would let the first screen to unmount unsubscribe the others.
    const listener = (event: Record<string, unknown>) => handleCostCategoryEvent(event)
    addListener(listener)
    return () => removeListener(listener)
  }, [])
}

/** The fixed + custom category lookup, rebuilt only when the custom list changes. */
export function useCostCategoryIndex(): CostCategoryIndex {
  const categories = useCostCategoryStore(s => s.categories)
  return useMemo(() => buildCostCategoryIndex(categories), [categories])
}

/** Whether the signed-in user may rename or delete a custom category: its creator or an admin. */
export function useCanManageCostCategory(): (createdBy: number | null | undefined) => boolean {
  const user = useAuthStore(s => s.user)
  return (createdBy) => !!user && (user.role === 'admin' || (createdBy != null && createdBy === user.id))
}

/**
 * The picker's starting key for an expense being edited. Unlike the index, it
 * keeps a `custom:<id>` even before the list has loaded, so opening and saving
 * an expense never quietly moves it to Other.
 */
export function initialCategoryKey(category: string | null | undefined): string {
  return resolveCostCategory(category)
}
