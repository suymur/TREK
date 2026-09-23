import type { CostCategoryCreateRequest, CostCategoryUpdateRequest } from '@trek/shared'
import { apiClient } from './client'

/** /api/costs/categories — the custom cost categories every user shares (#4). */
export const costCategoriesApi = {
  list: (): Promise<unknown> => apiClient.get('/costs/categories').then(r => r.data as unknown),
  create: (body: CostCategoryCreateRequest): Promise<unknown> =>
    apiClient.post('/costs/categories', body).then(r => r.data as unknown),
  update: (id: number, body: CostCategoryUpdateRequest): Promise<unknown> =>
    apiClient.put(`/costs/categories/${id}`, body).then(r => r.data as unknown),
  remove: (id: number): Promise<unknown> => apiClient.delete(`/costs/categories/${id}`).then(r => r.data as unknown),
}
