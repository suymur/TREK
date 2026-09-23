import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../tests/helpers/msw/server'
import { seedStore } from '../../../tests/helpers/store'
import { buildUser } from '../../../tests/helpers/factories'
import { addListener, removeListener } from '../../api/websocket'
import { useAuthStore } from '../../store/authStore'
import { useCostCategoryStore } from '../../store/costCategoryStore'
import type { CostCategoryRecord } from '@trek/shared'
import {
  handleCostCategoryEvent, initialCategoryKey, useCanManageCostCategory, useCostCategoryIndex, useCostCategorySync,
} from './useCostCategories'

const deko: CostCategoryRecord = { id: 1, name: 'Deko', icon: 'gift', color: '#db2777', created_by: 2, created_at: 'x', sort_order: 0 }

beforeEach(() => {
  useCostCategoryStore.setState({ categories: [], loaded: false })
  vi.mocked(addListener).mockClear()
  vi.mocked(removeListener).mockClear()
})

describe('useCostCategorySync (#4)', () => {
  it('loads the list on mount and listens to the socket until unmount', async () => {
    server.use(http.get('/api/costs/categories', () => HttpResponse.json({ categories: [deko] })))
    const { unmount } = renderHook(() => useCostCategorySync())
    await waitFor(() => expect(useCostCategoryStore.getState().categories).toHaveLength(1))
    expect(addListener).toHaveBeenCalledTimes(1)
    const listener = vi.mocked(addListener).mock.calls[0]![0]
    unmount()
    expect(removeListener).toHaveBeenCalledWith(listener)
  })

  it('keeps what is on screen when the read fails', async () => {
    useCostCategoryStore.setState({ categories: [deko] })
    server.use(http.get('/api/costs/categories', () => HttpResponse.json({ error: 'x' }, { status: 500 })))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderHook(() => useCostCategorySync())
    await waitFor(() => expect(useCostCategoryStore.getState().loaded).toBe(true))
    expect(useCostCategoryStore.getState().categories).toEqual([deko])
    spy.mockRestore()
  })
})

describe('handleCostCategoryEvent (#4)', () => {
  it('applies the list another client sent', () => {
    handleCostCategoryEvent({ type: 'costs:categories-changed', categories: [deko] })
    expect(useCostCategoryStore.getState().categories).toEqual([deko])
  })

  it('ignores other events and payloads that do not parse', () => {
    useCostCategoryStore.setState({ categories: [deko] })
    handleCostCategoryEvent({ type: 'budget:updated', categories: [] })
    handleCostCategoryEvent({ type: 'costs:categories-changed', categories: [{ id: 'x' }] })
    expect(useCostCategoryStore.getState().categories).toEqual([deko])
  })
})

describe('useCostCategoryIndex / useCanManageCostCategory (#4)', () => {
  it('rebuilds the index when the list changes', () => {
    const { result, rerender } = renderHook(() => useCostCategoryIndex())
    expect(result.current.meta('custom:1').key).toBe('other')
    act(() => useCostCategoryStore.setState({ categories: [deko] }))
    rerender()
    expect(result.current.meta('custom:1').label).toBe('Deko')
  })

  it('lets the creator and an admin manage a category, nobody else', () => {
    seedStore(useAuthStore, { user: buildUser({ id: 2, role: 'user' }) })
    const { result, rerender } = renderHook(() => useCanManageCostCategory())
    expect(result.current(2)).toBe(true)
    expect(result.current(3)).toBe(false)
    expect(result.current(null)).toBe(false)
    act(() => seedStore(useAuthStore, { user: buildUser({ id: 7, role: 'admin' }) }))
    rerender()
    expect(result.current(3)).toBe(true)
  })
})

describe('initialCategoryKey (#4)', () => {
  it('keeps a custom key before the list has loaded and maps legacy text', () => {
    expect(initialCategoryKey('custom:4')).toBe('custom:4')
    expect(initialCategoryKey('Hotel')).toBe('accommodation')
    expect(initialCategoryKey(null)).toBe('other')
  })
})
