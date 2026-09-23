import type { CostsOverviewResponse } from '@trek/shared'

const none = { total: 0, display_total: 0 }

/**
 * Two trips in two currencies, converted to EUR, for the cost overview screens.
 * Alice (1) is in both trips, bob (2) only in Tokyo; Rome's food is nobody's.
 */
export function buildCostsOverview(over: Partial<CostsOverviewResponse> = {}): CostsOverviewResponse {
  return {
    currency: 'EUR',
    trips: [
      {
        trip_id: 7, title: 'Tokyo', start_date: '2026-10-01', end_date: '2026-10-09', currency: 'JPY', is_archived: false,
        item_count: 2, total: 15000, display_total: 100, estimated_total: 0, estimated_display_total: 0,
        categories: [
          {
            category: 'food', total: 3000, display_total: 20, estimated_total: 0, estimated_display_total: 0,
            people: [{ user_id: 1, total: 1500, display_total: 10 }, { user_id: 2, total: 1500, display_total: 10 }],
            unassigned: none,
          },
          {
            category: 'transport', total: 12000, display_total: 80, estimated_total: 0, estimated_display_total: 0,
            people: [{ user_id: 1, total: 12000, display_total: 80 }],
            unassigned: none,
          },
        ],
        people: [{ user_id: 1, total: 13500, display_total: 90 }, { user_id: 2, total: 1500, display_total: 10 }],
        unassigned: none,
      },
      {
        trip_id: 3, title: 'Rome', start_date: '2026-05-01', end_date: '2026-05-08', currency: 'EUR', is_archived: true,
        item_count: 3, total: 406.5, display_total: 406.5, estimated_total: 0, estimated_display_total: 0,
        categories: [
          { category: 'accommodation', total: 200, display_total: 200, estimated_total: 0, estimated_display_total: 0, people: [{ user_id: 1, total: 200, display_total: 200 }], unassigned: none },
          { category: 'food', total: 56, display_total: 56, estimated_total: 0, estimated_display_total: 0, people: [], unassigned: { total: 56, display_total: 56 } },
          { category: 'flights', total: 150.5, display_total: 150.5, estimated_total: 0, estimated_display_total: 0, people: [{ user_id: 1, total: 150.5, display_total: 150.5 }], unassigned: none },
        ],
        people: [{ user_id: 1, total: 350.5, display_total: 350.5 }],
        unassigned: { total: 56, display_total: 56 },
      },
    ],
    total: 506.5, estimated_total: 0,
    categories: [
      { category: 'accommodation', total: 200, estimated_total: 0, people: [{ user_id: 1, total: 200 }], unassigned: 0 },
      { category: 'food', total: 76, estimated_total: 0, people: [{ user_id: 1, total: 10 }, { user_id: 2, total: 10 }], unassigned: 56 },
      { category: 'transport', total: 80, estimated_total: 0, people: [{ user_id: 1, total: 80 }], unassigned: 0 },
      { category: 'flights', total: 150.5, estimated_total: 0, people: [{ user_id: 1, total: 150.5 }], unassigned: 0 },
    ],
    people: [{ user_id: 1, total: 440.5 }, { user_id: 2, total: 10 }],
    unassigned: 56,
    participants: [
      { user_id: 1, username: 'Alice', avatar_url: null },
      { user_id: 2, username: 'bob', avatar_url: '/uploads/avatars/b.png' },
    ],
    unconverted_trip_ids: [],
    ...over,
  }
}
