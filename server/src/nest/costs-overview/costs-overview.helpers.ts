import {
  COST_CATEGORIES,
  resolveCostCategory,
  type CostCategory,
  type CostsOverviewPerson,
  type CostsOverviewResponse,
  type CostsOverviewShare,
  type CostsOverviewTrip,
} from '@trek/shared';
import { allocateDisplayCents, splitEqualShares } from '../budget/budget.service';

/**
 * The pure half of the cost overview (#2): no DB, no network. The service reads
 * the rows and the rates and hands them here.
 *
 * Final and estimated amounts are added separately in whole cents of the trip
 * currency. Only final amounts enter the per-person split, as in the settlement, so the category split of a trip adds up to its total. A
 * trip's cents convert to the display currency as one set (allocateDisplayCents),
 * so the converted categories add up to the converted total as well; the global
 * figures are plain sums of those display cents.
 *
 * Per person (#2): every expense is split into one share per member, the same way
 * the settlement splits it (custom member amounts when the item has any, otherwise
 * splitEqualShares), and whatever no member carries is "unassigned". Each category
 * of a trip is a row of whole cents, one cell per person plus the unassigned cell,
 * that sums to the category exactly; the row converts to display cents as one set,
 * pinned to the category's display figure. A trip's person figure is the sum of
 * its category cells, so people + unassigned = total at every level.
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
  id: number;
  trip_id: number;
  category: string | null;
  total_price: number | null;
  currency: string | null;
  exchange_rate: number | null;
  cost_status?: 'estimate' | 'final' | null;
  /** Unpaid part of the item, in its own currency. */
  open_amount?: number | null;
}

export interface OverviewMemberRow {
  budget_item_id: number;
  user_id: number;
  /** A custom share in the item's currency; null means "equal split". */
  amount: number | null;
  username: string;
  avatar_url: string | null;
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
export function itemToTripAmount(
  item: Pick<OverviewItemRow, 'total_price' | 'currency' | 'exchange_rate'>,
  tripCurrency: string,
  rates: Rates,
): number {
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

const toCents = (item: Pick<OverviewItemRow, 'total_price' | 'currency' | 'exchange_rate'>, tripCurrency: string, rates: Rates): number =>
  Math.round(itemToTripAmount(item, tripCurrency, rates) * 100);

/** Key of the unassigned cell in a row of cells; user ids are always positive. */
const UNASSIGNED = 0;

type Cells = Map<number, number>;

/**
 * One expense as whole trip cents per person, plus the unassigned rest. Same rule
 * as the settlement: an item with any custom member amount is split by those
 * amounts (a member without one carries 0), otherwise equally with splitEqualShares.
 */
export function splitItemCents(
  item: OverviewItemRow,
  members: Pick<OverviewMemberRow, 'user_id' | 'amount'>[],
  tripCurrency: string,
  rates: Rates,
): Cells {
  const itemCents = toCents(item, tripCurrency, rates);
  const cells: Cells = new Map();
  const hasCustom = members.some((m) => m.amount !== null && m.amount !== undefined);
  const equal = hasCustom ? {} : splitEqualShares(itemCents, members, item.id);
  let assigned = 0;
  for (const m of members) {
    const share = hasCustom
      ? m.amount === null || m.amount === undefined
        ? 0
        : toCents({ total_price: m.amount, currency: item.currency, exchange_rate: item.exchange_rate }, tripCurrency, rates)
      : (equal[m.user_id] ?? 0);
    cells.set(m.user_id, (cells.get(m.user_id) ?? 0) + share);
    assigned += share;
  }
  cells.set(UNASSIGNED, itemCents - assigned);
  return cells;
}

function addCells(into: Cells, from: Cells): void {
  for (const [k, v] of from) into.set(k, (into.get(k) ?? 0) + v);
}

/** Convert a row of cells to display cents that sum to `displayTotal` exactly. */
function convertCells(cells: Cells, factor: number, displayTotal: number): Cells {
  const keys = [...cells.keys()].sort((a, b) => a - b);
  const out = allocateDisplayCents(keys.map((k) => cells.get(k) ?? 0), factor, displayTotal);
  return new Map(keys.map((k, i) => [k, out[i] ?? 0]));
}

function shares(trip: Cells, display: Cells | null): { people: CostsOverviewShare[]; unassigned: { total: number; display_total: number | null } } {
  const people = [...trip.keys()]
    .filter((k) => k !== UNASSIGNED)
    .sort((a, b) => a - b)
    .map((user_id) => ({
      user_id,
      total: toMoney(trip.get(user_id) ?? 0),
      display_total: display ? toMoney(display.get(user_id) ?? 0) : null,
    }));
  return {
    people,
    unassigned: {
      total: toMoney(trip.get(UNASSIGNED) ?? 0),
      display_total: display ? toMoney(display.get(UNASSIGNED) ?? 0) : null,
    },
  };
}

function globalShares(cells: Cells): { people: { user_id: number; total: number }[]; unassigned: number } {
  return {
    people: [...cells.keys()]
      .filter((k) => k !== UNASSIGNED)
      .sort((a, b) => a - b)
      .map((user_id) => ({ user_id, total: toMoney(cells.get(user_id) ?? 0) })),
    unassigned: toMoney(cells.get(UNASSIGNED) ?? 0),
  };
}

/** Everyone with a share in the listed trips, sorted by name (then id, for equal names). */
function participantsOf(members: OverviewMemberRow[]): CostsOverviewPerson[] {
  const byId = new Map<number, CostsOverviewPerson>();
  for (const m of members) {
    if (!byId.has(m.user_id)) byId.set(m.user_id, { user_id: m.user_id, username: m.username, avatar_url: m.avatar_url });
  }
  return [...byId.values()].sort((a, b) => a.username.localeCompare(b.username) || a.user_id - b.user_id);
}

function buildOverviewPart(
  trips: OverviewTripRow[],
  items: OverviewItemRow[],
  members: OverviewMemberRow[],
  display: string,
  rates: Rates,
): CostsOverviewResponse {
  const itemsByTrip = new Map<number, OverviewItemRow[]>();
  for (const item of items) {
    const list = itemsByTrip.get(item.trip_id);
    if (list) list.push(item);
    else itemsByTrip.set(item.trip_id, [item]);
  }
  const membersByItem = new Map<number, OverviewMemberRow[]>();
  for (const m of members) {
    const list = membersByItem.get(m.budget_item_id);
    if (list) list.push(m);
    else membersByItem.set(m.budget_item_id, [m]);
  }
  const tripIds = new Set(trips.map((t) => t.id));
  const itemIds = new Set(items.filter((i) => tripIds.has(i.trip_id)).map((i) => i.id));

  const globalCats = new Map<CostCategory, Cells>();
  const globalPeople: Cells = new Map();
  let globalTotal = 0;
  let globalOpen = 0;
  const unconverted: number[] = [];

  const rows = trips.map((trip): CostsOverviewTrip => {
    const tripCurrency = tripCurrencyOf(trip);
    const tripItems = itemsByTrip.get(trip.id) ?? [];
    const catCells = new Map<CostCategory, Cells>();
    let openCents = 0;
    for (const item of tripItems) {
      const key = resolveCostCategory(item.category);
      const cells = catCells.get(key) ?? new Map<number, number>();
      addCells(cells, splitItemCents(item, membersByItem.get(item.id) ?? [], tripCurrency, rates));
      catCells.set(key, cells);
      if (item.open_amount) openCents += toCents({ ...item, total_price: item.open_amount }, tripCurrency, rates);
    }
    const keys = COST_CATEGORIES.filter((k) => catCells.has(k));
    const sumOf = (cells: Cells | undefined) => [...(cells?.values() ?? [])].reduce((a, c) => a + c, 0);
    const catCents = keys.map((k) => sumOf(catCells.get(k)));
    const totalCents = catCents.reduce((a, c) => a + c, 0);

    // A trip without expenses is 0 in any currency, rate or not.
    const factor = tripItems.length === 0 ? 1 : displayFactor(tripCurrency, display, rates);
    let displayTotal: number | null = null;
    let displayOpen: number | null = null;
    let displayCats: (Cells | null)[] = keys.map(() => null);
    const tripCells: Cells = new Map();
    for (const k of keys) addCells(tripCells, catCells.get(k) ?? new Map());
    let tripDisplayCells: Cells | null = null;

    if (factor === null) {
      unconverted.push(trip.id);
    } else {
      displayTotal = Math.round(totalCents * factor);
      displayOpen = Math.round(openCents * factor);
      globalOpen += displayOpen;
      const allocated = allocateDisplayCents(catCents, factor, displayTotal);
      displayCats = keys.map((k, i) => convertCells(catCells.get(k) ?? new Map(), factor, allocated[i] ?? 0));
      tripDisplayCells = new Map();
      for (const cells of displayCats) if (cells) addCells(tripDisplayCells, cells);
      globalTotal += displayTotal;
      addCells(globalPeople, tripDisplayCells);
      keys.forEach((k, i) => {
        const g = globalCats.get(k) ?? new Map<number, number>();
        addCells(g, displayCats[i] ?? new Map());
        globalCats.set(k, g);
      });
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
      estimated_total: 0,
      estimated_display_total: 0,
      display_total: displayTotal === null ? null : toMoney(displayTotal),
      open_total: toMoney(openCents),
      display_open_total: displayOpen === null ? null : toMoney(displayOpen),
      categories: keys.map((category, i) => {
        const d = displayCats[i] ?? null;
        return {
          category,
          estimated_total: 0,
          estimated_display_total: 0,
          total: toMoney(catCents[i] ?? 0),
          display_total: d === null ? null : toMoney(sumOf(d)),
          ...shares(catCells.get(category) ?? new Map(), d),
        };
      }),
      ...shares(tripCells, tripDisplayCells),
    };
  });

  return {
    currency: display,
    trips: rows,
    total: toMoney(globalTotal),
    open_total: toMoney(globalOpen),
    estimated_total: 0,
    categories: COST_CATEGORIES.filter((k) => globalCats.has(k)).map((category) => {
      const cells = globalCats.get(category) ?? new Map<number, number>();
      return {
        category,
        estimated_total: 0,
        total: toMoney([...cells.values()].reduce((a, c) => a + c, 0)),
        ...globalShares(cells),
      };
    }),
    ...globalShares(globalPeople),
    participants: participantsOf(members.filter((m) => itemIds.has(m.budget_item_id))),
    unconverted_trip_ids: unconverted,
  };
}

/** Keep estimates outside the settlement-like person split and expose them separately. */
export function buildCostsOverview(
  trips: OverviewTripRow[],
  items: OverviewItemRow[],
  members: OverviewMemberRow[],
  display: string,
  rates: Rates,
): CostsOverviewResponse {
  const finalItems = items.filter(item => item.cost_status !== 'estimate');
  const estimateItems = items.filter(item => item.cost_status === 'estimate');
  const final = buildOverviewPart(trips, finalItems, members, display, rates);
  const estimate = buildOverviewPart(trips, estimateItems, [], display, rates);
  const estimateTrips = new Map(estimate.trips.map(row => [row.trip_id, row]));
  const mergedTrips = final.trips.map(row => {
    const e = estimateTrips.get(row.trip_id)!;
    const eCats = new Map(e.categories.map(cat => [cat.category, cat]));
    const fCats = new Map(row.categories.map(cat => [cat.category, cat]));
    return {
      ...row,
      item_count: row.item_count + e.item_count,
      estimated_total: e.total,
      estimated_display_total: e.display_total,
      open_total: toMoney(Math.round(row.open_total * 100) + Math.round(e.open_total * 100)),
      display_open_total: row.display_open_total === null || e.display_open_total === null
        ? null
        : toMoney(Math.round(row.display_open_total * 100) + Math.round(e.display_open_total * 100)),
      categories: COST_CATEGORIES.filter(key => fCats.has(key) || eCats.has(key)).map(key => {
        const f = fCats.get(key);
        const ec = eCats.get(key);
        return {
          ...(f ?? {
            category: key, total: 0, display_total: 0,
            people: [], unassigned: { total: 0, display_total: 0 },
          }),
          estimated_total: ec?.total ?? 0,
          estimated_display_total: ec?.display_total ?? (e.display_total === null ? null : 0),
        };
      }),
    };
  });
  const eGlobalCats = new Map(estimate.categories.map(cat => [cat.category, cat]));
  const fGlobalCats = new Map(final.categories.map(cat => [cat.category, cat]));
  return {
    ...final,
    trips: mergedTrips,
    estimated_total: estimate.total,
    open_total: toMoney(Math.round(final.open_total * 100) + Math.round(estimate.open_total * 100)),
    categories: COST_CATEGORIES.filter(key => fGlobalCats.has(key) || eGlobalCats.has(key)).map(key => ({
      ...(fGlobalCats.get(key) ?? { category: key, total: 0, people: [], unassigned: 0 }),
      estimated_total: eGlobalCats.get(key)?.total ?? 0,
    })),
    unconverted_trip_ids: [...new Set([...final.unconverted_trip_ids, ...estimate.unconverted_trip_ids])],
  };
}
