import { describe, it, expect } from 'vitest';
import {
  buildCostsOverview,
  itemToTripAmount,
  needsLiveRates,
  resolveOverviewCurrency,
  tripCurrencyOf,
  type OverviewItemRow,
  type OverviewTripRow,
} from '../../../src/nest/costs-overview/costs-overview.helpers';

const trip = (id: number, currency: string | null, over: Partial<OverviewTripRow> = {}): OverviewTripRow => ({
  id, title: `Trip ${id}`, start_date: '2026-05-01', end_date: '2026-05-08', currency, is_archived: 0, ...over,
});
const item = (trip_id: number, category: string | null, total_price: number, over: Partial<OverviewItemRow> = {}): OverviewItemRow => ({
  trip_id, category, total_price, currency: null, exchange_rate: 1, ...over,
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
    const out = buildCostsOverview([trip(1, null, { is_archived: 1, start_date: null, end_date: null })], [], 'EUR', null);
    expect(out.trips[0]).toEqual({
      trip_id: 1, title: 'Trip 1', start_date: null, end_date: null, currency: 'EUR', is_archived: true,
      item_count: 0, total: 0, display_total: 0, categories: [], open_total: 0, display_open_total: 0,
    });
    expect(out.categories).toEqual([]);
  });

  it('adds negative amounts (refunds) into the category they belong to', () => {
    const out = buildCostsOverview([trip(1, 'EUR')], [item(1, 'food', 20), item(1, 'food', -5)], 'EUR', null);
    expect(out.trips[0]!.categories).toEqual([{ category: 'food', total: 15, display_total: 15 }]);
  });

  it('adds the open amounts (#6) per trip in the trip currency, converted at the expense rate', () => {
    const out = buildCostsOverview(
      [trip(1, 'EUR'), trip(2, 'JPY')],
      [
        item(1, 'accommodation', 3000, { open_amount: 2000 }),
        item(1, 'food', 20, { currency: 'USD', exchange_rate: 1.25, open_amount: 10 }),
        item(1, 'food', 5),
        item(2, 'food', 1500, { open_amount: 1500 }),
      ],
      'EUR',
      { EUR: 1, JPY: 150 },
    );
    expect(out.trips[0]).toMatchObject({ open_total: 2008, display_open_total: 2008 });
    expect(out.trips[1]).toMatchObject({ open_total: 1500, display_open_total: 10 });
    expect(out.open_total).toBe(2018);
  });

  it('leaves an unconvertible trip out of the global open total', () => {
    const out = buildCostsOverview([trip(1, 'JPY')], [item(1, 'food', 1500, { open_amount: 1500 })], 'EUR', null);
    expect(out.trips[0]).toMatchObject({ open_total: 1500, display_open_total: null });
    expect(out.open_total).toBe(0);
  });
});
