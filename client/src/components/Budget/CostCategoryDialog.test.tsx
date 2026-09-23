import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '../../../tests/helpers/render'
import { server } from '../../../tests/helpers/msw/server'
import { resetAllStores, seedStore } from '../../../tests/helpers/store'
import { buildUser } from '../../../tests/helpers/factories'
import { ToastContainer } from '../shared/Toast'
import { useAuthStore } from '../../store/authStore'
import { useCostCategoryStore } from '../../store/costCategoryStore'
import { setForcedOffline } from '../../sync/networkMode'
import CostCategoryPickerActions from './CostCategoryPickerActions'
import { costCategoryErrorKey } from './CostCategoryDialog'
import { CostCategoryOfflineError } from '../../repo/costCategoryRepo'
import type { CostCategoryRecord } from '@trek/shared'

const deko: CostCategoryRecord = { id: 5, name: 'Deko', icon: 'gift', color: '#db2777', created_by: 2, created_at: 'x', sort_order: 0 }

function renderPicker(selected = 'food', onSelect = vi.fn()) {
  render(<><ToastContainer /><CostCategoryPickerActions selected={selected} onSelect={onSelect} variant="desktop" /></>)
  return onSelect
}

beforeEach(() => {
  resetAllStores()
  seedStore(useAuthStore, { isAuthenticated: true, user: buildUser({ id: 2 }) })
  useCostCategoryStore.setState({ categories: [], loaded: true })
})
afterEach(() => setForcedOffline(false))

describe('CostCategoryPickerActions + CostCategoryDialog (#4)', () => {
  it('creates a category with a name, icon and colour and picks it', async () => {
    let body: unknown = null
    server.use(http.post('/api/costs/categories', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ category: { ...deko, icon: 'shirt', color: '#2563eb', name: 'Kleidung' } }, { status: 201 })
    }))
    const onSelect = renderPicker()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New category' }))
    await user.type(screen.getByPlaceholderText('e.g. Decoration'), '  Kleidung ')
    await user.click(screen.getByRole('button', { name: 'shirt' }))
    await user.click(screen.getByRole('button', { name: '#2563eb' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('custom:5'))
    expect(body).toEqual({ name: 'Kleidung', icon: 'shirt', color: '#2563eb' })
    expect(useCostCategoryStore.getState().categories.map(c => c.name)).toEqual(['Kleidung'])
    expect(screen.queryByPlaceholderText('e.g. Decoration')).not.toBeInTheDocument()
  })

  it('offers no save for an empty name', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('button', { name: 'New category' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('tells the user when the name is taken', async () => {
    server.use(http.post('/api/costs/categories', () => HttpResponse.json({ error: 'x' }, { status: 409 })))
    renderPicker()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New category' }))
    await user.type(screen.getByPlaceholderText('e.g. Decoration'), 'Deko')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument()
  })

  it('shows Edit only for a picked custom category the user may change, and deletes it', async () => {
    useCostCategoryStore.setState({ categories: [deko] })
    server.use(http.delete('/api/costs/categories/5', () => HttpResponse.json({ success: true, moved: 2 })))
    renderPicker('custom:5')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit category' }))
    expect(screen.getByDisplayValue('Deko')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Delete/ }))
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1]!)
    expect(await screen.findByText('Category deleted. 2 expenses moved to Other.')).toBeInTheDocument()
    expect(useCostCategoryStore.getState().categories).toEqual([])
  })

  it('hides Edit for a category someone else created', () => {
    useCostCategoryStore.setState({ categories: [{ ...deko, created_by: 9 }] })
    renderPicker('custom:5')
    expect(screen.queryByRole('button', { name: 'Edit category' })).not.toBeInTheDocument()
  })

  it('maps write failures to their message', () => {
    expect(costCategoryErrorKey(new CostCategoryOfflineError())).toBe('costs.customCat.offline')
    expect(costCategoryErrorKey({ response: { status: 403 } })).toBe('costs.customCat.notAllowed')
    expect(costCategoryErrorKey(new Error('x'))).toBe('common.unknownError')
  })
})
