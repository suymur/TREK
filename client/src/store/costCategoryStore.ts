import { create } from 'zustand'
import type { CostCategoryCreateRequest, CostCategoryRecord, CostCategoryUpdateRequest } from '@trek/shared'
import { cacheCostCategories, costCategoryRepo } from '../repo/costCategoryRepo'

/**
 * The custom cost categories (#4): one instance-wide list, so one store rather
 * than a slice of the per-trip store. Components read it through
 * useCostCategoryIndex (components/Budget/useCostCategories.ts), which builds
 * the fixed + custom lookup every category display goes through.
 */
interface CostCategoryState {
  categories: CostCategoryRecord[]
  loaded: boolean
  /** Read the list (server, else the offline cache). A failed read keeps what is on screen. */
  load: () => Promise<void>
  create: (body: CostCategoryCreateRequest) => Promise<CostCategoryRecord>
  update: (id: number, body: CostCategoryUpdateRequest) => Promise<CostCategoryRecord>
  remove: (id: number) => Promise<{ moved: number }>
  /** The full list another client's change sent over the socket. */
  applyRemote: (categories: CostCategoryRecord[]) => void
}

const upsert = (list: CostCategoryRecord[], row: CostCategoryRecord) => {
  const next = list.some(c => c.id === row.id) ? list.map(c => (c.id === row.id ? row : c)) : [...list, row]
  return next.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
}

export const useCostCategoryStore = create<CostCategoryState>((set) => ({
  categories: [],
  loaded: false,

  load: async () => {
    try {
      set({ categories: await costCategoryRepo.list(), loaded: true })
    } catch (err) {
      console.error('[cost-categories] load failed', err)
      set({ loaded: true })
    }
  },

  create: async (body) => {
    const row = await costCategoryRepo.create(body)
    set(s => ({ categories: upsert(s.categories, row) }))
    return row
  },

  update: async (id, body) => {
    const row = await costCategoryRepo.update(id, body)
    set(s => ({ categories: upsert(s.categories, row) }))
    return row
  },

  remove: async (id) => {
    const result = await costCategoryRepo.remove(id)
    set(s => ({ categories: s.categories.filter(c => c.id !== id) }))
    return result
  },

  applyRemote: (categories) => {
    set({ categories, loaded: true })
    cacheCostCategories(categories).catch(err => console.error('[cost-categories] cache write failed', err))
  },
}))
