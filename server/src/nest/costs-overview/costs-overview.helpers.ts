import {
  COST_CATEGORIES,
  resolveCostCategory,
  type CostCategory,
  type CostsOverviewResponse,
  type CostsOverviewTrip,
} from '@trek/shared';
import { allocateDisplayCents } from '../budget/budget.service';

/**
 * The pure half of the cost overview (#2): no DB, no network. The service reads
 * the rows and the rates and hands them here.
 *
 * Money is added in whole cents of the trip currency, the same rule the
 * settlement follows, so the category split of a trip adds up to its total. A
 * trip's cents convert to the display currency as one set (allocateDisplayCents),
 * so the converted categories add up to the converted total as well; the global
 * figures are plain sums of those display cents.
 */

export interface OverviewTripRow {
  id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  currency: string | null;
  is_archived: number | null;
}

export interface OverviewItemRow {
  trip_id: number;
  category: string | null;
  total_price: number | null;
  currency: string | null;
  exchange_rate: number | null;
}

/** Live rates keyed "units of X per 1 display currency", as ExchangeRatesService returns them. */
export type Rates = Record<string, number> | null;

const FALLBACK_CURRENCY = 'EUR';

export function tripCurrencyOf(trip: Pick<OverviewTripRow, 'currency'>): string {
  return (trip.currency || FALLBACK_CURRENCY).toUpperCase();
}

/**
 * The currency the overview adds up in. The user's default currency when one is
 * set. An empty default means "show each trip in its own currency", which gives
 * no single currency to add in, so the overview takes the currency most of the
 * user's trips use (on a tie, the one of the newest trip) and EUR without trips.
 */
export function resolveOverviewCurrency(preferred: unknown, tripCurrencies: string[]): string {
  if (typeof preferred === 'string' && preferred.trim()) return preferred.trim().toUpperCase();
  const counts = new Map<string, number>();
  for (const cur of tripCurrencies) counts.set(cur, (counts.get(cur) ?? 0) + 1);
  let best: string | null = null;
  for (const [cur, n] of counts) {
    if (best === null || n > (counts.get(best) ?? 0)) best = cur;
  }
  return best ?? FALLBACK_CURRENCY;
}

/** Does the item carry a real frozen rate? 1 is the column default, not a booked rate. */
function hasFrozenRate(rate: number | null): rate is number {
  return rate != null && rate > 0 && rate !== 1;
}

function isForeign(item: OverviewItemRow, tripCurrency: string): boolean {
  return (item.currency || tripCurrency).toUpperCase() !== tripCurrency;
}

/**
 * One expense in its trip's base currency. Same rule as the settlement and the
 * Costs tab: the rate frozen at entry wins; a foreign row without one (written
 * before the freeze, or when the rate fetch failed) converts with today's rate,
 * and stays as typed when no rate is available.
 */
export function itemToTripAmount(item: OverviewItemRow, tripCurrency: string, rates: Rates): number {
  const amount = item.total_price || 0;
  const cur = (item.currency || tripCurrency).toUpperCase();
  if (cur === tripCurrency) return amount;
  if (hasFrozenRate(item.exchange_rate)) return amount / item.exchange_rate;
  const rCur = rates?.[cur];
  const rTrip = rates?.[tripCurrency];
  if (rCur && rCur > 0 && rTrip && rTrip > 0) return (amount / rCur) * rTrip;
  return amount;
}

/** Whether building the overview needs live rates at all (skip the fetch when it does not). */
export function needsLiveRates(trips: OverviewTripRow[], items: OverviewItemRow[], display: string): boolean {
  const currencyOf = new Map(trips.map((t) => [t.id, tripCurrencyOf(t)]));
  if ([...currencyOf.values()].some((cur) => cur !== display)) return true;
  return items.some((item) => {
    const tripCur = currencyOf.get(item.trip_id) ?? FALLBACK_CURRENCY;
    return isForeign(item, tripCur) && !hasFrozenRate(item.exchange_rate);
  });
}

/** Trip currency → display currency, or null when the rate is missing. */
function displayFactor(tripCurrency: string, display: string, rates: Rates): number | null {
  if (tripCurrency === display) return 1;
  const r = rates?.[tripCurrency];
  return r && r > 0 ? 1 / r : null;
}

const toMoney = (cents: number): number => cents / 100;

export function buildCostsOverview(
  trips: OverviewTripRow[],
  items: OverviewItemRow[],
  display: string,
  rates: Rates,
): CostsOverviewResponse {
  const itemsByTrip = new Map<number, OverviewItemRow[]>();
  for (const item of items) {
    const list = itemsByTrip.get(item.trip_id);
    if (list) list.push(item);
    else itemsByTrip.set(item.trip_id, [item]);
  }

  const globalCents = new Map<CostCategory, number>();
  let globalTotal = 0;
  const unconverted: number[] = [];

  const rows = trips.map((trip): CostsOverviewTrip => {
    const tripCurrency = tripCurrencyOf(trip);
    const tripItems = itemsByTrip.get(trip.id) ?? [];
    const cents = new Map<CostCategory, number>();
    for (const item of tripItems) {
      const key = resolveCostCategory(item.category);
      const c = Math.round(itemToTripAmount(item, tripCurrency, rates) * 100);
      cents.set(key, (cents.get(key) ?? 0) + c);
    }
    const keys = COST_CATEGORIES.filter((k) => cents.has(k));
    const catCents = keys.map((k) => cents.get(k) ?? 0);
    const totalCents = catCents.reduce((a, c) => a + c, 0);

    // A trip without expenses is 0 in any currency, rate or not.
    const factor = tripItems.length === 0 ? 1 : displayFactor(tripCurrency, display, rates);
    let displayTotal: number | null = null;
    let displayCats: (number | null)[] = keys.map(() => null);
    if (factor === null) {
      unconverted.push(trip.id);
    } else {
      displayTotal = Math.round(totalCents * factor);
      const allocated = allocateDisplayCents(catCents, factor, displayTotal);
      displayCats = allocated;
      globalTotal += displayTotal;
      keys.forEach((k, i) => globalCents.set(k, (globalCents.get(k) ?? 0) + (allocated[i] ?? 0)));
    }

    return {
      trip_id: trip.id,
      title: trip.title,
      start_date: trip.start_date ?? null,
      end_date: trip.end_date ?? null,
      currency: tripCurrency,
      is_archived: !!trip.is_archived,
      item_count: tripItems.length,
      total: toMoney(totalCents),
      display_total: displayTotal === null ? null : toMoney(displayTotal),
      categories: keys.map((category, i) => {
        const d = displayCats[i];
        return { category, total: toMoney(catCents[i] ?? 0), display_total: d == null ? null : toMoney(d) };
      }),
    };
  });

  return {
    currency: display,
    trips: rows,
    total: toMoney(globalTotal),
    categories: COST_CATEGORIES.filter((k) => globalCents.has(k)).map((category) => ({
      category,
      total: toMoney(globalCents.get(category) ?? 0),
    })),
    unconverted_trip_ids: unconverted,
  };
}
