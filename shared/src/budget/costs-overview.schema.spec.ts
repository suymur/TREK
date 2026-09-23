import { COST_CATEGORIES } from './budget.schema';
import { costsOverviewResponseSchema, resolveCostCategory } from './costs-overview.schema';

import { describe, it, expect } from 'vitest';

describe('resolveCostCategory', () => {
  it('keeps every fixed key as it is', () => {
    for (const key of COST_CATEGORIES) expect(resolveCostCategory(key)).toBe(key);
  });

  it('maps legacy and booking labels case-insensitively', () => {
    expect(resolveCostCategory('Flight')).toBe('flights');
    expect(resolveCostCategory(' Hotel ')).toBe('accommodation');
    expect(resolveCostCategory('Car park')).toBe('parking');
  });

  it('sends empty and unknown values to other', () => {
    expect(resolveCostCategory(null)).toBe('other');
    expect(resolveCostCategory(undefined)).toBe('other');
    expect(resolveCostCategory('')).toBe('other');
    expect(resolveCostCategory('General')).toBe('other');
  });
});

describe('costsOverviewResponseSchema', () => {
  const trip = {
    trip_id: 1,
    title: 'Rome',
    start_date: '2026-05-01',
    end_date: null,
    currency: 'EUR',
    is_archived: false,
    item_count: 2,
    total: 12.5,
    display_total: 12.5,
    categories: [{ category: 'food', total: 12.5, display_total: 12.5 }],
    open_total: 0,
    display_open_total: 0,
  };

  it('accepts a well-formed overview', () => {
    const parsed = costsOverviewResponseSchema.safeParse({
      currency: 'EUR',
      trips: [trip],
      total: 12.5,
      categories: [{ category: 'food', total: 12.5 }],
      open_total: 0,
      unconverted_trip_ids: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a trip without a display figure', () => {
    const parsed = costsOverviewResponseSchema.safeParse({
      currency: 'USD',
      trips: [
        {
          ...trip,
          display_total: null,
          display_open_total: null,
          categories: [{ category: 'food', total: 12.5, display_total: null }],
        },
      ],
      total: 0,
      categories: [],
      open_total: 0,
      unconverted_trip_ids: [1],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a category key outside the fixed list', () => {
    const parsed = costsOverviewResponseSchema.safeParse({
      currency: 'EUR',
      trips: [],
      total: 0,
      categories: [{ category: 'Hotel', total: 1 }],
      open_total: 0,
      unconverted_trip_ids: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('requires the open amount on every trip', () => {
    const { open_total: _open, ...withoutOpen } = trip;
    const parsed = costsOverviewResponseSchema.safeParse({
      currency: 'EUR',
      trips: [withoutOpen],
      total: 12.5,
      categories: [],
      open_total: 0,
      unconverted_trip_ids: [],
    });
    expect(parsed.success).toBe(false);
  });
});
