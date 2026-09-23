import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/helpers/msw/server'
import { offlineDb } from '../db/offlineDb'
import { setForcedOffline } from '../sync/networkMode'
import { costCategoryRepo, CostCategoryOfflineError } from './costCategoryRepo'
import type { CostCategoryRecord } from '@trek/shared'

const deko: CostCategoryRecord = { id: 1, name: 'Deko', icon: 'gift', color: '#db2777', created_by: 1, created_at: 'x', sort_order: 0 }
const kleidung: CostCategoryRecord = { ...deko, id: 2, name: 'Kleidung', icon: 'shirt', sort_order: 1 }

beforeEach(async () => { await offlineDb.costCategories.clear() })
afterEach(() => setForcedOffline(false))

describe('costCategoryRepo (#4)', () => {
  it('reads the list online and replaces the cached copy', async () => {
    await offlineDb.costCategories.put({ ...kleidung, id: 99, name: 'Deleted elsewhere' })
    server.use(http.get('/api/costs/categories', () => HttpResponse.json({ categories: [deko, kleidung] })))
    expect((await costCategoryRepo.list()).map(c => c.name)).toEqual(['Deko', 'Kleidung'])
    expect((await offlineDb.costCategories.toArray()).map(c => c.id).sort()).toEqual([1, 2])
  })

  it('answers from the cache offline, in sort order', async () => {
    await offlineDb.costCategories.bulkPut([kleidung, deko])
    setForcedOffline(true)
    expect((await costCategoryRepo.list()).map(c => c.name)).toEqual(['Deko', 'Kleidung'])
  })

  it('creates, updates and deletes online and keeps the cache in step', async () => {
    server.use(
      http.post('/api/costs/categories', () => HttpResponse.json({ category: deko }, { status: 201 })),
      http.put('/api/costs/categories/1', () => HttpResponse.json({ category: { ...deko, name: 'Dekoration' } })),
      http.delete('/api/costs/categories/1', () => HttpResponse.json({ success: true, moved: 3 })),
    )
    await costCategoryRepo.create({ name: 'Deko', icon: 'gift', color: '#db2777' })
    expect(await offlineDb.costCategories.get(1)).toMatchObject({ name: 'Deko' })
    await costCategoryRepo.update(1, { name: 'Dekoration' })
    expect(await offlineDb.costCategories.get(1)).toMatchObject({ name: 'Dekoration' })
    await expect(costCategoryRepo.remove(1)).resolves.toEqual({ moved: 3 })
    expect(await offlineDb.costCategories.get(1)).toBeUndefined()
  })

  it('refuses every write offline before a request goes out', async () => {
    setForcedOffline(true)
    await expect(costCategoryRepo.create({ name: 'A', icon: 'tag', color: '#000000' })).rejects.toBeInstanceOf(CostCategoryOfflineError)
    await expect(costCategoryRepo.update(1, { name: 'A' })).rejects.toBeInstanceOf(CostCategoryOfflineError)
    await expect(costCategoryRepo.remove(1)).rejects.toBeInstanceOf(CostCategoryOfflineError)
  })
})
