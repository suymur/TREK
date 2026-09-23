import { describe, it, expect } from 'vitest'
import type { CostsOverviewResponse } from '@trek/shared'
import { formatMoney } from '../../utils/formatters'
import { buildOverviewView, costsTabPath, formatTripDates } from './costsOverviewModel'

const eur = (v: number) => formatMoney(v, 'EUR', 'en-US')

const none = { total: 0, display_total: 0 }

const data: CostsOverviewResponse = {
  currency: 'EUR',
  trips: [
    {
      trip_id: 7, title: 'Tokyo', start_date: '2026-10-01', end_date: '2026-10-09', currency: 'JPY', is_archived: false,
      item_count: 2, total: 15000, display_total: 100, estimated_total: 0, estimated_display_total: 0, open_total: 7500, display_open_total: 50,
      categories: [
        { category: 'food', total: 3000, display_total: 20, estimated_total: 0, estimated_display_total: 0, people: [{ user_id: 2, total: 3000, display_total: 20 }], unassigned: none },
        { category: 'transport', total: 12000, display_total: 80, estimated_total: 0, estimated_display_total: 0, people: [], unassigned: { total: 12000, display_total: 80 } },
      ],
      people: [{ user_id: 2, total: 3000, display_total: 20 }],
      unassigned: { total: 12000, display_total: 80 },
    },
    {
      trip_id: 3, title: 'Rome', start_date: null, end_date: null, currency: 'EUR', is_archived: true,
      item_count: 1, total: 40, display_total: 40, estimated_total: 0, estimated_display_total: 0, open_total: 0, display_open_total: 0,
      categories: [{ category: 'food', total: 40, display_total: 40, estimated_total: 0, estimated_display_total: 0, people: [{ user_id: 1, total: 40, display_total: 40 }], unassigned: none }],
      people: [{ user_id: 1, total: 40, display_total: 40 }],
      unassigned: none,
    },
    {
      trip_id: 2, title: 'Bangkok', start_date: '2026-01-05', end_date: null, currency: 'THB', is_archived: false,
      item_count: 1, total: 500, display_total: null, estimated_total: 0, estimated_display_total: null, open_total: 100, display_open_total: null,
      categories: [{ category: 'food', total: 500, display_total: null, estimated_total: 0, estimated_display_total: null, people: [{ user_id: 1, total: 500, display_total: null }], unassigned: { total: 0, display_total: null } }],
      people: [{ user_id: 1, total: 500, display_total: null }],
      unassigned: { total: 0, display_total: null },
    },
    {
      trip_id: 1, title: 'Empty', start_date: null, end_date: null, currency: 'USD', is_archived: false,
      item_count: 0, total: 0, display_total: 0, estimated_total: 0, estimated_display_total: 0, open_total: 0, display_open_total: 0, categories: [], people: [], unassigned: none,
    },
  ],
  total: 140, estimated_total: 0, open_total: 50,
  categories: [
    { category: 'food', total: 60, estimated_total: 0, people: [{ user_id: 1, total: 40 }, { user_id: 2, total: 20 }], unassigned: 0 },
    { category: 'transport', total: 80, estimated_total: 0, people: [], unassigned: 80 },
  ],
  people: [{ user_id: 1, total: 40 }, { user_id: 2, total: 20 }],
  unassigned: 80,
  participants: [
    { user_id: 1, username: 'Alice', avatar_url: null },
    { user_id: 2, username: 'bob', avatar_url: '/a.png' },
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
    expect(view.totals.categories.map(c => [c.category, c.amount])).toEqual([
      ['food', eur(60)],
      ['transport', eur(80)],
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
    expect(rome.categories[0]).toMatchObject({ category: 'food', amount: eur(40), original: null })
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

  it('shows open installments per trip and excludes an unconverted trip from the global amount', () => {
    expect(view.rows[0]!.open).toBe(eur(50))
    expect(view.rows[1]!.open).toBeNull()
    expect(view.rows[2]!.open).toBe(formatMoney(100, 'THB', 'en-US'))
    expect(view.totals.open).toBe(eur(50))
  })

  it('builds the per-person columns sorted as the server sent them', () => {
    expect(view.people).toEqual([
      { userId: 1, name: 'Alice', avatarUrl: null },
      { userId: 2, name: 'bob', avatarUrl: '/a.png' },
    ])
    expect(view.showUnassigned).toBe(true)
  })

  it('fills a cell per person, null where the person is not in the trip', () => {
    const [tokyo, rome, bangkok, empty] = view.rows
    expect(tokyo!.people).toEqual([null, eur(20)])
    expect(tokyo!.unassigned).toBe(eur(80))
    expect(rome!.people).toEqual([eur(40), null])
    expect(empty!.people).toEqual([null, null])
    // No rate: the share stays in the trip currency.
    expect(bangkok!.people).toEqual([formatMoney(500, 'THB', 'en-US'), null])
    expect(tokyo!.categories[1]).toMatchObject({ people: [null, null], unassigned: eur(80) })
  })

  it('sums each person across trips in the global row', () => {
    expect(view.totals.people).toEqual([eur(40), eur(20)])
    expect(view.totals.unassigned).toBe(eur(80))
    expect(view.totals.categories[1]).toMatchObject({ people: [null, null], unassigned: eur(80) })
  })

  it('formats estimated totals separately from final and person shares', () => {
    const overview = {
      ...data,
      estimated_total: 5,
      trips: data.trips.map((t, i) => i === 0 ? { ...t, estimated_total: 750, estimated_display_total: 5 } : t),
    }
    const result = buildOverviewView(overview, 'en-US')
    expect(result.totals.amount).toBe(eur(140))
    expect(result.totals.estimated).toBe(eur(5))
    expect(result.rows[0]!.estimated).toBe(eur(5))
    expect(result.rows[0]!.estimatedOriginal).toBe(formatMoney(750, 'JPY', 'en-US'))
    expect(result.rows[0]!.people).toEqual([null, eur(20)])
  })

  it('hides the unassigned column when nothing is unassigned anywhere', () => {
    const noRest = {
      ...data,
      trips: data.trips.map(t => ({
        ...t,
        unassigned: { total: 0, display_total: 0 },
        categories: t.categories.map(c => ({ ...c, unassigned: { total: 0, display_total: 0 } })),
      })),
    }
    expect(buildOverviewView(noRest, 'en-US').showUnassigned).toBe(false)
  })
})
