import type { CostCategory, CostsOverviewResponse, CostsOverviewTrip } from '@trek/shared'
import { formatMoney } from '../../utils/formatters'
import { tripStartPath } from '../../utils/startDestination'

/**
 * Pure view model of the cost overview (#2), shared by the desktop page and the
 * phone screen so the two shells only differ in markup. No React in here.
 */

export type CostsOverviewStatus = 'loading' | 'ready' | 'offline' | 'error'

export interface OverviewCategoryLine {
  category: CostCategory
  /** In the display currency, or null when the trip had no exchange rate. */
  amount: string | null
  /** In the trip currency, only when that is not the display currency. */
  original: string | null
}

export interface OverviewTripRow {
  tripId: number
  title: string
  dates: string | null
  archived: boolean
  itemCount: number
  /** The trip total in the display currency, or null when no rate was available. */
  amount: string | null
  /** The trip total in the trip currency, only when that is not the display currency. */
  original: string | null
  categories: OverviewCategoryLine[]
}

export interface OverviewTotals {
  amount: string
  categories: { category: CostCategory; amount: string }[]
}

export interface OverviewView {
  currency: string
  rows: OverviewTripRow[]
  totals: OverviewTotals
  /** True when at least one trip is missing from the totals for want of a rate. */
  incomplete: boolean
}

/** The trip's Costs tab: the planner reads `?tab=` on first render, desktop and phone alike. */
export function costsTabPath(tripId: number): string {
  return tripStartPath(tripId, 'finanzplan')
}

function formatDay(date: string, locale: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatTripDates(start: string | null, end: string | null, locale: string): string | null {
  if (start && end && start !== end) return `${formatDay(start, locale)} – ${formatDay(end, locale)}`
  const one = start || end
  return one ? formatDay(one, locale) : null
}

function tripRow(trip: CostsOverviewTrip, display: string, locale: string): OverviewTripRow {
  const foreign = trip.currency !== display
  const inDisplay = (v: number | null) => (v === null ? null : formatMoney(v, display, locale))
  const inTrip = (v: number, converted: number | null) =>
    foreign || converted === null ? formatMoney(v, trip.currency, locale) : null
  return {
    tripId: trip.trip_id,
    title: trip.title,
    dates: formatTripDates(trip.start_date, trip.end_date, locale),
    archived: trip.is_archived,
    itemCount: trip.item_count,
    amount: inDisplay(trip.display_total),
    original: trip.item_count > 0 ? inTrip(trip.total, trip.display_total) : null,
    categories: trip.categories.map(c => ({
      category: c.category,
      amount: inDisplay(c.display_total),
      original: inTrip(c.total, c.display_total),
    })),
  }
}

export function buildOverviewView(data: CostsOverviewResponse, locale: string): OverviewView {
  const display = data.currency
  return {
    currency: display,
    rows: data.trips.map(t => tripRow(t, display, locale)),
    totals: {
      amount: formatMoney(data.total, display, locale),
      categories: data.categories.map(c => ({ category: c.category, amount: formatMoney(c.total, display, locale) })),
    },
    incomplete: data.unconverted_trip_ids.length > 0,
  }
}
