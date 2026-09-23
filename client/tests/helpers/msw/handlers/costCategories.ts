import { http, HttpResponse } from 'msw';

/** Custom cost categories (#4): none by default; tests that need some override the list. */
export const costCategoryHandlers = [
  http.get('/api/costs/categories', () => HttpResponse.json({ categories: [] })),
];
