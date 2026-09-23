import type { CostsOverviewResponse } from '@trek/shared'

/** Two shared trips in two currencies, converted to EUR, for the cost overview screens. */
export function buildCostsOverview(over: Partial<CostsOverviewResponse> = {}): CostsOverviewResponse {
  return {
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
        trip_id: 3, title: 'Rome', start_date: '2026-05-01', end_date: '2026-05-08', currency: 'EUR', is_archived: true,
        item_count: 3, total: 406.5, display_total: 406.5,
        categories: [
          { category: 'accommodation', total: 200, display_total: 200 },
          { category: 'food', total: 56, display_total: 56 },
          { category: 'flights', total: 150.5, display_total: 150.5 },
        ],
      },
    ],
    total: 506.5,
    categories: [
      { category: 'accommodation', total: 200 },
      { category: 'food', total: 76 },
      { category: 'transport', total: 80 },
      { category: 'flights', total: 150.5 },
    ],
    unconverted_trip_ids: [],
    ...over,
  }
}
