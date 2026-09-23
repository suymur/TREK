import type { CostCategory, CostsOverviewResponse, CostsOverviewTrip, CostsOverviewTripCategory } from '@trek/shared'
import { formatMoney } from '../../utils/formatters'
import { tripStartPath } from '../../utils/startDestination'

/**
 * Pure view model of the cost overview (#2), shared by the desktop page and the
 * phone screen so the two shells only differ in markup. No React in here.
 */

export type CostsOverviewStatus = 'loading' | 'ready' | 'offline' | 'error'

/** One per-person column of the table: someone with a share in any listed trip. */
export interface OverviewPersonColumn {
  userId: number
  name: string
  avatarUrl: string | null
}

/**
 * The per-person cells of one line, in column order. A cell is null when the
 * person has no share in that line (shown as "–", not as 0). A trip without an
 * exchange rate shows its shares in the trip currency.
 */
export interface OverviewSplit {
  people: (string | null)[]
  unassigned: string
}

export interface OverviewCategoryLine extends OverviewSplit {
  category: CostCategory
  /** In the display currency, or null when the trip had no exchange rate. */
  amount: string | null
  /** In the trip currency, only when that is not the display currency. */
  original: string | null
  estimated: string | null
  estimatedOriginal: string | null
}

export interface OverviewTripRow extends OverviewSplit {
  tripId: number
  title: string
  dates: string | null
  archived: boolean
  itemCount: number
  /** The trip total in the display currency, or null when no rate was available. */
  amount: string | null
  /** The trip total in the trip currency, only when that is not the display currency. */
  original: string | null
  estimated: string | null
  estimatedOriginal: string | null
  categories: OverviewCategoryLine[]
  /** Remaining installments, in display currency or the trip currency when conversion is unavailable. */
  open: string | null
}

export interface OverviewTotals extends OverviewSplit {
  amount: string
  estimated: string
  open: string | null
  categories: ({ category: CostCategory; amount: string; estimated: string } & OverviewSplit)[]
}

export interface OverviewView {
  currency: string
  rows: OverviewTripRow[]
  totals: OverviewTotals
  /** The per-person columns, sorted by name. */
  people: OverviewPersonColumn[]
  /** False when nothing is unassigned anywhere, so the column can be left out. */
  showUnassigned: boolean
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

type Money = (value: number, currency: string) => string

/** A trip line's cells: display figures, or trip-currency figures when the trip had no rate. */
function tripSplit(
  split: Pick<CostsOverviewTripCategory, 'people' | 'unassigned'>,
  columns: OverviewPersonColumn[],
  trip: CostsOverviewTrip,
  display: string,
  money: Money,
): OverviewSplit {
  const cell = (total: number, displayTotal: number | null | undefined) =>
    displayTotal == null ? money(total, trip.currency) : money(displayTotal, display)
  const byId = new Map(split.people.map(p => [p.user_id, p]))
  return {
    people: columns.map(c => {
      const share = byId.get(c.userId)
      return share ? cell(share.total, share.display_total) : null
    }),
    unassigned: cell(split.unassigned.total, split.unassigned.display_total),
  }
}

function globalSplit(
  split: Pick<CostsOverviewResponse, 'people' | 'unassigned'>,
  columns: OverviewPersonColumn[],
  display: string,
  money: Money,
): OverviewSplit {
  const byId = new Map(split.people.map(p => [p.user_id, p.total]))
  return {
    people: columns.map(c => {
      const total = byId.get(c.userId)
      return total === undefined ? null : money(total, display)
    }),
    unassigned: money(split.unassigned, display),
  }
}

function hasUnassigned(data: CostsOverviewResponse): boolean {
  return data.trips.some(t => t.unassigned.total !== 0 || t.categories.some(c => c.unassigned.total !== 0))
}

function tripRow(trip: CostsOverviewTrip, display: string, locale: string, columns: OverviewPersonColumn[]): OverviewTripRow {
  const money: Money = (v, c) => formatMoney(v, c, locale)
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
    estimated: inDisplay(trip.estimated_display_total),
    estimatedOriginal: trip.estimated_total !== 0 ? inTrip(trip.estimated_total, trip.estimated_display_total) : null,
    open: trip.open_total > 0
      ? trip.display_open_total === null ? money(trip.open_total, trip.currency) : money(trip.display_open_total, display)
      : null,
    categories: trip.categories.map(c => ({
      category: c.category,
      amount: inDisplay(c.display_total),
      original: inTrip(c.total, c.display_total),
      estimated: inDisplay(c.estimated_display_total),
      estimatedOriginal: c.estimated_total !== 0 ? inTrip(c.estimated_total, c.estimated_display_total) : null,
      ...tripSplit(c, columns, trip, display, money),
    })),
    ...tripSplit(trip, columns, trip, display, money),
  }
}

export function buildOverviewView(data: CostsOverviewResponse, locale: string): OverviewView {
  const display = data.currency
  const money: Money = (v, c) => formatMoney(v, c, locale)
  const people = data.participants.map(p => ({ userId: p.user_id, name: p.username, avatarUrl: p.avatar_url }))
  return {
    currency: display,
    rows: data.trips.map(t => tripRow(t, display, locale, people)),
    totals: {
      amount: money(data.total, display),
      estimated: money(data.estimated_total, display),
      open: data.open_total > 0 ? money(data.open_total, display) : null,
      categories: data.categories.map(c => ({
        category: c.category,
        amount: money(c.total, display),
        estimated: money(c.estimated_total, display),
        ...globalSplit(c, people, display, money),
      })),
      ...globalSplit(data, people, display, money),
    },
    people,
    showUnassigned: hasUnassigned(data),
    incomplete: data.unconverted_trip_ids.length > 0,
  }
}
