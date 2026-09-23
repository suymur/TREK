import { describe, it, expect } from 'vitest'
import type { CostCategoryRecord } from '@trek/shared'
import { buildCostCategoryIndex, catMeta, categoryLabel, COST_CATEGORY_LIST, FIXED_COST_CATEGORY_INDEX } from './costsCategories'

const row = (over: Partial<CostCategoryRecord> = {}): CostCategoryRecord => ({
  id: 5, name: 'Deko', icon: 'gift', color: '#db2777', created_by: 1, created_at: '2026-09-23 10:00:00', sort_order: 0, ...over,
})
const t = (key: string) => `t:${key}`

describe('buildCostCategoryIndex (#4)', () => {
  it('lists the fixed categories first, then the custom ones', () => {
    const cats = buildCostCategoryIndex([row(), row({ id: 9, name: 'Kleidung', icon: 'shirt' })])
    expect(cats.list.map(c => c.key)).toEqual([...COST_CATEGORY_LIST.map(c => c.key), 'custom:5', 'custom:9'])
    expect(cats.custom.map(c => c.label)).toEqual(['Deko', 'Kleidung'])
  })

  it('resolves a custom key to its name, icon and colour', () => {
    const cats = buildCostCategoryIndex([row()])
    const meta = cats.meta('custom:5')
    expect(meta.key).toBe('custom:5')
    expect(meta.color).toBe('#db2777')
    expect(meta.custom?.id).toBe(5)
    expect(cats.label('custom:5', t)).toBe('Deko')
  })

  it('sends a custom key without a category to other', () => {
    const cats = buildCostCategoryIndex([row()])
    expect(cats.meta('custom:6').key).toBe('other')
    expect(FIXED_COST_CATEGORY_INDEX.meta('custom:5').key).toBe('other')
    expect(catMeta('custom:5').key).toBe('other')
  })

  it('keeps the fixed labels translated and the legacy mapping working', () => {
    const cats = buildCostCategoryIndex([row()])
    expect(cats.label('food', t)).toBe('t:costs.cat.food')
    expect(cats.meta('Hotel').key).toBe('accommodation')
    expect(categoryLabel(cats.meta(null), t)).toBe('t:costs.cat.other')
  })
})
