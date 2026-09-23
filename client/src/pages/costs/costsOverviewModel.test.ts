import { describe, it, expect } from 'vitest'
import type { CostsOverviewResponse } from '@trek/shared'
import { formatMoney } from '../../utils/formatters'
import { buildOverviewView, costsTabPath, formatTripDates } from './costsOverviewModel'

const eur = (v: number) => formatMoney(v, 'EUR', 'en-US')

const data: CostsOverviewResponse = {
  currency: 'EUR',
  trips: [
    {
      trip_id: 7, title: 'Tokyo', start_date: '2026-10-01', end_date: '2026-10-09', currency: 'JPY', is_archived: false,
      item_count: 2, total: 15000, display_total: 100,
      categories: [
        { category: 'food', total: 3000, display_total: 20 },
        { category: 'transport', total: 12000, display_total: 80 },
      ],
    },
    {
      trip_id: 3, title: 'Rome', start_date: null, end_date: null, currency: 'EUR', is_archived: true,
      item_count: 1, total: 40, display_total: 40,
      categories: [{ category: 'food', total: 40, display_total: 40 }],
    },
    {
      trip_id: 2, title: 'Bangkok', start_date: '2026-01-05', end_date: null, currency: 'THB', is_archived: false,
      item_count: 1, total: 500, display_total: null,
      categories: [{ category: 'food', total: 500, display_total: null }],
    },
    {
      trip_id: 1, title: 'Empty', start_date: null, end_date: null, currency: 'USD', is_archived: false,
      item_count: 0, total: 0, display_total: 0, categories: [],
    },
  ],
  total: 140,
  categories: [
    { category: 'food', total: 60 },
    { category: 'transport', total: 80 },
  ],
  unconverted_trip_ids: [2],
}

describe('costsTabPath', () => {
  it('opens the trip planner on its Costs tab', () => {
    expect(costsTabPath(42)).toBe('/trips/42?tab=finanzplan')
  })
})

describe('formatTripDates', () => {
  it('formats a range, a single day and nothing', () => {
    expect(formatTripDates('2026-10-01', '2026-10-09', 'en-US')).toBe('Oct 1, 2026 – Oct 9, 2026')
    expect(formatTripDates('2026-10-01', '2026-10-01', 'en-US')).toBe('Oct 1, 2026')
    expect(formatTripDates(null, '2026-10-09', 'en-US')).toBe('Oct 9, 2026')
    expect(formatTripDates(null, null, 'en-US')).toBeNull()
  })

  it('passes an unparsable date through', () => {
    expect(formatTripDates('someday', null, 'en-US')).toBe('someday')
  })
})

describe('buildOverviewView', () => {
  const view = buildOverviewView(data, 'en-US')

  it('formats the totals in the display currency', () => {
    expect(view.currency).toBe('EUR')
    expect(view.totals.amount).toBe(eur(140))
    expect(view.totals.categories).toEqual([
      { category: 'food', amount: eur(60) },
      { category: 'transport', amount: eur(80) },
    ])
    expect(view.incomplete).toBe(true)
  })

  it('shows a foreign trip in the display currency with its own currency beside it', () => {
    const tokyo = view.rows[0]!
    expect(tokyo).toMatchObject({ tripId: 7, title: 'Tokyo', amount: eur(100), itemCount: 2, archived: false })
    expect(tokyo.original).toBe(formatMoney(15000, 'JPY', 'en-US'))
    expect(tokyo.categories[0]).toMatchObject({ category: 'food', amount: eur(20) })
    expect(tokyo.categories[0]!.original).toBe(formatMoney(3000, 'JPY', 'en-US'))
  })

  it('shows a trip in the display currency without a second figure', () => {
    const rome = view.rows[1]!
    expect(rome).toMatchObject({ amount: eur(40), original: null, archived: true, dates: null })
    expect(rome.categories[0]).toEqual({ category: 'food', amount: eur(40), original: null })
  })

  it('keeps a trip without a rate in its own currency only', () => {
    const bangkok = view.rows[2]!
    expect(bangkok.amount).toBeNull()
    expect(bangkok.original).toBe(formatMoney(500, 'THB', 'en-US'))
    expect(bangkok.categories[0]!.amount).toBeNull()
  })

  it('shows no second figure for a trip without expenses', () => {
    expect(view.rows[3]).toMatchObject({ amount: eur(0), original: null, categories: [] })
  })
})
