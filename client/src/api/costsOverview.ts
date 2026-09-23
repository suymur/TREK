import { apiClient } from './client'

/** GET /api/costs/overview — the costs of every trip the user can reach (#2). */
export const costsOverviewApi = {
  get: (signal?: AbortSignal): Promise<unknown> =>
    apiClient.get('/costs/overview', { signal }).then(r => r.data as unknown),
}
