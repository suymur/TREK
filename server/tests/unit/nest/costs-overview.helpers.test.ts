import { describe, it, expect } from 'vitest';
import {
  buildCostsOverview,
  itemToTripAmount,
  needsLiveRates,
  resolveOverviewCurrency,
  tripCurrencyOf,
  splitItemCents,
  type OverviewItemRow,
  type OverviewMemberRow,
  type OverviewTripRow,
} from '../../../src/nest/costs-overview/costs-overview.helpers';

const trip = (id: number, currency: string | null, over: Partial<OverviewTripRow> = {}): OverviewTripRow => ({
  id, title: `Trip ${id}`, start_date: '2026-05-01', end_date: '2026-05-08', currency, is_archived: 0, ...over,
});
let nextItemId = 100;
const item = (trip_id: number, category: string | null, total_price: number, over: Partial<OverviewItemRow> = {}): OverviewItemRow => ({
  id: nextItemId++, trip_id, category, total_price, currency: null, exchange_rate: 1, ...over,
});
const NAMES: Record<number, string> = { 1: 'Alice', 2: 'bob', 3: 'Carol' };
const member = (it: OverviewItemRow, user_id: number, amount: number | null = null): OverviewMemberRow => ({
  budget_item_id: it.id, user_id, amount, username: NAMES[user_id] ?? `user${user_id}`, avatar_url: null,
});
const sum = (xs: number[]) => Math.round(xs.reduce((a, v) => a + v * 100, 0)) / 100;

describe('resolveOverviewCurrency', () => {
  it('uses the default currency when the user set one', () => {
    expect(resolveOverviewCurrency(' usd ', ['EUR', 'EUR'])).toBe('USD');
  });

  it('falls back to the currency most trips use, the newest on a tie', () => {
    expect(resolveOverviewCurrency('', ['CHF', 'EUR', 'EUR'])).toBe('EUR');
    expect(resolveOverviewCurrency(undefined, ['CHF', 'EUR'])).toBe('CHF');
  });

  it('falls back to EUR without trips', () => {
    expect(resolveOverviewCurrency(null, [])).toBe('EUR');
  });
});

describe('tripCurrencyOf', () => {
  it('upper-cases and defaults to EUR', () => {
    expect(tripCurrencyOf({ currency: 'jpy' })).toBe('JPY');
    expect(tripCurrencyOf({ currency: null })).toBe('EUR');
  });
});

describe('itemToTripAmount', () => {
  it('keeps an amount in the trip currency (NULL currency = the trip currency)', () => {
    expect(itemToTripAmount(item(1, 'food', 10), 'EUR', null)).toBe(10);
    expect(itemToTripAmount(item(1, 'food', 10, { currency: 'eur' }), 'EUR', null)).toBe(10);
  });

  it('prefers the rate frozen at entry', () => {
    expect(itemToTripAmount(item(1, 'food', 200, { currency: 'USD', exchange_rate: 2 }), 'EUR', { USD: 5, EUR: 1 })).toBe(100);
  });

  it('converts a foreign row without a frozen rate with the live rates', () => {
    // Rates are per 1 display currency (here CHF): 1 CHF = 2 USD = 1 EUR.
    expect(itemToTripAmount(item(1, 'food', 20, { currency: 'USD' }), 'EUR', { CHF: 1, USD: 2, EUR: 1 })).toBe(10);
  });

  it('keeps the typed amount when no rate is available', () => {
    expect(itemToTripAmount(item(1, 'food', 20, { currency: 'USD' }), 'EUR', null)).toBe(20);
  });
});

describe('needsLiveRates', () => {
  it('is false when every trip is in the display currency and nothing needs a live rate', () => {
    expect(needsLiveRates([trip(1, 'EUR')], [item(1, 'food', 1), item(1, 'food', 1, { currency: 'USD', exchange_rate: 1.1 })], 'EUR')).toBe(false);
  });

  it('is true for a trip in another currency', () => {
    expect(needsLiveRates([trip(1, 'USD')], [], 'EUR')).toBe(true);
  });

  it('is true for a foreign row without a frozen rate', () => {
    expect(needsLiveRates([trip(1, 'EUR')], [item(1, 'food', 1, { currency: 'USD', exchange_rate: 1 })], 'EUR')).toBe(true);
  });
});

describe('buildCostsOverview', () => {
  it('gives two trips two separate totals and a global total that is their sum', () => {
    const out = buildCostsOverview(
      [trip(2, 'EUR'), trip(1, 'EUR')],
      [item(1, 'food', 10.5), item(1, 'Hotel', 100), item(2, 'flights', 300), item(2, 'food', 0.25)],
      [],
      'EUR',
      null,
    );
    expect(out.currency).toBe('EUR');
    expect(out.trips.map((t) => [t.trip_id, t.total, t.display_total])).toEqual([
      [2, 300.25, 300.25],
      [1, 110.5, 110.5],
    ]);
    expect(out.total).toBe(410.75);
    expect(out.total).toBe(sum(out.trips.map((t) => t.display_total ?? 0)));
    expect(out.unconverted_trip_ids).toEqual([]);
  });

  it('splits each trip and the global total by category, in the fixed order, summing exactly', () => {
    const out = buildCostsOverview(
      [trip(1, 'EUR')],
      [item(1, 'other', 1), item(1, 'food', 0.1), item(1, 'food', 0.2), item(1, 'Flight', 99.99), item(1, null, 2)],
      [],
      'EUR',
      null,
    );
    const t = out.trips[0]!;
    expect(t.categories.map((c) => [c.category, c.total])).toEqual([
      ['food', 0.3],
      ['flights', 99.99],
      ['other', 3],
    ]);
    expect(sum(t.categories.map((c) => c.total))).toBe(t.total);
    expect(out.categories.map((c) => c.category)).toEqual(['food', 'flights', 'other']);
    expect(sum(out.categories.map((c) => c.total))).toBe(out.total);
  });

  it('converts a trip in another currency into the display currency, categories still summing', () => {
    // 1 EUR = 3 USD, so a USD trip converts by 1/3 — the split has to hand out the lost cents.
    const out = buildCostsOverview(
      [trip(1, 'USD'), trip(2, 'EUR')],
      [item(1, 'food', 10), item(1, 'fuel', 10), item(1, 'tips', 10.01), item(2, 'food', 5)],
      [],
      'EUR',
      { EUR: 1, USD: 3 },
    );
    const usd = out.trips[0]!;
    expect(usd.currency).toBe('USD');
    expect(usd.total).toBe(30.01);
    expect(usd.display_total).toBe(10);
    expect(sum(usd.categories.map((c) => c.display_total ?? 0))).toBe(usd.display_total);
    expect(out.total).toBe(15);
    expect(sum(out.categories.map((c) => c.total))).toBe(out.total);
    expect(out.categories.find((c) => c.category === 'food')?.total).toBeGreaterThan(5);
  });

  it('leaves a trip without a rate out of the global figures and names it', () => {
    const out = buildCostsOverview(
      [trip(1, 'THB'), trip(2, 'EUR'), trip(3, 'XYZ')],
      [item(1, 'food', 100), item(2, 'food', 5)],
      [],
      'EUR',
      { EUR: 1 },
    );
    expect(out.trips[0]).toMatchObject({ trip_id: 1, total: 100, display_total: null });
    expect(out.trips[0]!.categories[0]).toMatchObject({ category: 'food', total: 100, display_total: null });
    // Trip 3 has no expenses: 0 in any currency, so it is not "unconverted".
    expect(out.trips[2]).toMatchObject({ trip_id: 3, total: 0, display_total: 0, item_count: 0, categories: [] });
    expect(out.unconverted_trip_ids).toEqual([1]);
    expect(out.total).toBe(5);
  });

  it('carries the trip metadata and turns the archive flag into a boolean', () => {
    const out = buildCostsOverview([trip(1, null, { is_archived: 1, start_date: null, end_date: null })], [], [], 'EUR', null);
    expect(out.trips[0]).toEqual({
      trip_id: 1, title: 'Trip 1', start_date: null, end_date: null, currency: 'EUR', is_archived: true,
      item_count: 0, total: 0, display_total: 0, estimated_total: 0, estimated_display_total: 0, open_total: 0, display_open_total: 0, categories: [],
      people: [], unassigned: { total: 0, display_total: 0 },
    });
    expect(out.categories).toEqual([]);
  });

  it('adds negative amounts (refunds) into the category they belong to', () => {
    const out = buildCostsOverview([trip(1, 'EUR')], [item(1, 'food', 20), item(1, 'food', -5)], [], 'EUR', null);
    expect(out.trips[0]!.categories).toMatchObject([{ category: 'food', total: 15, display_total: 15 }]);
  });
});

// ── Per person ───────────────────────────────────────────────────────────────

const cents = (xs: number[]) => xs.reduce((a, v) => a + Math.round(v * 100), 0);

describe('splitItemCents', () => {
  it('splits equally in whole cents, the remainder rotating with the item id', () => {
    const it0 = item(1, 'food', 100, { id: 1 });
    const cells = splitItemCents(it0, [1, 2, 3].map((u) => ({ user_id: u, amount: null })), 'EUR', null);
    // 10000 / 3 = 3333 r1; item 1 % 3 = 1 → the extra cent lands on the second member.
    expect(Object.fromEntries(cells)).toEqual({ 0: 0, 1: 3333, 2: 3334, 3: 3333 });
  });

  it('uses custom member amounts and leaves the uncovered rest unassigned', () => {
    const it0 = item(1, 'food', 100);
    const cells = splitItemCents(it0, [{ user_id: 1, amount: 60 }, { user_id: 2, amount: 30 }, { user_id: 3, amount: null }], 'EUR', null);
    expect(Object.fromEntries(cells)).toEqual({ 0: 1000, 1: 6000, 2: 3000, 3: 0 });
  });

  it('gives an item without members to nobody', () => {
    expect(Object.fromEntries(splitItemCents(item(1, 'food', 12.34), [], 'EUR', null))).toEqual({ 0: 1234 });
  });

  it('converts custom amounts with the frozen rate of the item', () => {
    const it0 = item(1, 'food', 30, { currency: 'USD', exchange_rate: 1.5 });
    const cells = splitItemCents(it0, [{ user_id: 1, amount: 15 }, { user_id: 2, amount: 15 }], 'EUR', null);
    expect(Object.fromEntries(cells)).toEqual({ 0: 0, 1: 1000, 2: 1000 });
  });
});

describe('buildCostsOverview — per person', () => {
  it('sums each person across items and categories; people + unassigned = total to the cent', () => {
    const a = item(1, 'food', 100, { id: 1 });
    const b = item(1, 'transport', 50);
    const c = item(1, 'food', 7.77); // no members
    const out = buildCostsOverview(
      [trip(1, 'EUR')],
      [a, b, c],
      [member(a, 1), member(a, 2), member(a, 3), member(b, 1, 20), member(b, 2, 30)],
      'EUR',
      null,
    );
    const t = out.trips[0]!;
    expect(t.people).toEqual([
      { user_id: 1, total: 53.33, display_total: 53.33 },
      { user_id: 2, total: 63.34, display_total: 63.34 },
      { user_id: 3, total: 33.33, display_total: 33.33 },
    ]);
    expect(t.unassigned).toEqual({ total: 7.77, display_total: 7.77 });
    expect(cents([...t.people.map((p) => p.total), t.unassigned.total])).toBe(cents([t.total]));
    for (const cat of t.categories) {
      expect(cents([...cat.people.map((p) => p.total), cat.unassigned.total])).toBe(cents([cat.total]));
    }
    // Carol is only in the food expense.
    expect(t.categories.find((x) => x.category === 'transport')!.people.map((p) => p.user_id)).toEqual([1, 2]);
    expect(out.people).toEqual([
      { user_id: 1, total: 53.33 },
      { user_id: 2, total: 63.34 },
      { user_id: 3, total: 33.33 },
    ]);
    expect(out.unassigned).toBe(7.77);
  });

  it('keeps the per-person split exact after converting a foreign trip', () => {
    // 1 EUR = 3 USD: a factor of 1/3 that rounds every cell.
    const a = item(1, 'food', 10, { id: 5 });
    const b = item(1, 'fuel', 10.01, { id: 6 });
    const c = item(1, 'food', 0.05, { id: 7 });
    const out = buildCostsOverview(
      [trip(1, 'USD')],
      [a, b, c],
      [member(a, 1), member(a, 2), member(a, 3), member(b, 2), member(b, 3)],
      'EUR',
      { EUR: 1, USD: 3 },
    );
    const t = out.trips[0]!;
    expect(t.display_total).toBe(6.69);
    const disp = (xs: { display_total?: number | null }[]) => cents(xs.map((x) => x.display_total ?? 0));
    expect(disp([...t.people, t.unassigned])).toBe(cents([t.display_total!]));
    for (const cat of t.categories) {
      expect(disp([...cat.people, cat.unassigned])).toBe(cents([cat.display_total!]));
    }
    expect(cents([...out.people.map((p) => p.total), out.unassigned])).toBe(cents([out.total]));
    for (const cat of out.categories) {
      expect(cents([...cat.people.map((p) => p.total), cat.unassigned])).toBe(cents([cat.total]));
    }
  });

  it('sums a person across trips globally and lists them only in the trips they are in', () => {
    const a = item(1, 'food', 20);
    const b = item(2, 'food', 30);
    const out = buildCostsOverview([trip(2, 'EUR'), trip(1, 'EUR')], [a, b], [member(a, 1), member(a, 2), member(b, 1)], 'EUR', null);
    expect(out.trips.find((t) => t.trip_id === 2)!.people.map((p) => p.user_id)).toEqual([1]);
    expect(out.people).toEqual([
      { user_id: 1, total: 40 },
      { user_id: 2, total: 10 },
    ]);
    expect(out.categories[0]).toEqual({ category: 'food', total: 50, estimated_total: 0, people: [{ user_id: 1, total: 40 }, { user_id: 2, total: 10 }], unassigned: 0 });
  });

  it('lists the participants sorted by name, case-insensitively', () => {
    const a = item(1, 'food', 30);
    const out = buildCostsOverview([trip(1, 'EUR')], [a], [member(a, 3), member(a, 2), member(a, 1)], 'EUR', null);
    expect(out.participants.map((p) => p.username)).toEqual(['Alice', 'bob', 'Carol']);
  });

  it('keeps trip-currency shares of a trip without a rate and leaves them out globally', () => {
    const a = item(1, 'food', 100);
    const out = buildCostsOverview([trip(1, 'THB')], [a], [member(a, 1)], 'EUR', { EUR: 1 });
    expect(out.trips[0]!.people).toEqual([{ user_id: 1, total: 100, display_total: null }]);
    expect(out.trips[0]!.unassigned).toEqual({ total: 0, display_total: null });
    expect(out.people).toEqual([]);
    expect(out.participants.map((p) => p.user_id)).toEqual([1]);
  });
});

describe('buildCostsOverview — final and estimated', () => {
  it('keeps estimates out of per-person shares while grouping both statuses by category', () => {
    const final = item(1, 'food', 10, { cost_status: 'final' });
    const estimate = item(1, 'food', 7, { cost_status: 'estimate' });
    const onlyEstimate = item(1, 'transport', 3, { cost_status: 'estimate' });
    const out = buildCostsOverview(
      [trip(1, 'EUR')], [final, estimate, onlyEstimate],
      [member(final, 1), member(estimate, 2), member(onlyEstimate, 2)], 'EUR', null,
    );
    expect(out.total).toBe(10);
    expect(out.estimated_total).toBe(10);
    expect(out.people).toEqual([{ user_id: 1, total: 10 }]);
    expect(out.participants.map(p => p.user_id)).toEqual([1]);
    expect(out.trips[0]).toMatchObject({ item_count: 3, total: 10, estimated_total: 10 });
    expect(out.trips[0]!.categories.map(c => [c.category, c.total, c.estimated_total])).toEqual([
      ['food', 10, 7], ['transport', 0, 3],
    ]);
  });
});
