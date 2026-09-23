import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Routes, Route, useLocation } from 'react-router'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '../../tests/helpers/render'
import { server } from '../../tests/helpers/msw/server'
import { resetAllStores, seedStore } from '../../tests/helpers/store'
import { buildUser } from '../../tests/helpers/factories'
import { buildCostsOverview } from '../../tests/helpers/costsOverview'
import { useAuthStore } from '../store/authStore'
import { setForcedOffline } from '../sync/networkMode'
import { formatMoney } from '../utils/formatters'
import CostsOverviewPage from './CostsOverviewPage'

// Testing Library collapses the no-break space Intl puts before the symbol; the matcher has to as well.
const money = (v: number, cur: string) => formatMoney(v, cur, 'en-US').replace(/\s+/g, ' ')
const eur = (v: number) => money(v, 'EUR')

function TripProbe() {
  const location = useLocation()
  return <div data-testid="trip-location">{location.pathname + location.search}</div>
}

function renderPage() {
  return render(
    <Routes>
      <Route path="/costs" element={<CostsOverviewPage />} />
      <Route path="/trips/:id" element={<TripProbe />} />
    </Routes>,
    { initialEntries: ['/costs'] },
  )
}

beforeEach(() => {
  resetAllStores()
  seedStore(useAuthStore, { isAuthenticated: true, user: buildUser() })
  server.use(http.get('/api/costs/overview', () => HttpResponse.json(buildCostsOverview())))
})

afterEach(() => setForcedOffline(false))

describe('CostsOverviewPage', () => {
  it('FE-PAGE-COSTS-001: one row per trip and a global total row in the display currency', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: 'Open the costs of Tokyo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open the costs of Rome' })).toBeInTheDocument()
    expect(screen.getByText('All your trips, added up in EUR')).toBeInTheDocument()
    expect(screen.getByText(eur(100))).toBeInTheDocument()
    expect(screen.getByText(eur(406.5))).toBeInTheDocument()
    expect(screen.getByText(money(15000, 'JPY'))).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'All trips' })).toBeInTheDocument()
    expect(screen.getByText(eur(506.5))).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    // No category lines until the box is ticked.
    expect(screen.queryByText('Transport')).not.toBeInTheDocument()
  })

  it('FE-PAGE-COSTS-002: "by category" splits each trip and the global total', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: 'Open the costs of Tokyo' })

    await user.click(screen.getByRole('checkbox', { name: 'By category' }))

    // Tokyo transport, and transport in the global split.
    expect(screen.getAllByText('Transport')).toHaveLength(2)
    expect(screen.getAllByText(eur(80))).toHaveLength(2)
    // Global food = 20 (Tokyo) + 56 (Rome).
    expect(screen.getByText(eur(76))).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'By category' }))
    expect(screen.queryByText('Transport')).not.toBeInTheDocument()
  })

  it('FE-PAGE-COSTS-003: a click on a trip opens its Costs tab', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Open the costs of Rome' }))

    expect(screen.getByTestId('trip-location')).toHaveTextContent('/trips/3?tab=finanzplan')
  })

  it('FE-PAGE-COSTS-004: a click anywhere on the row opens the trip too', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: 'Open the costs of Tokyo' })

    await user.click(screen.getByText(eur(100)))

    expect(screen.getByTestId('trip-location')).toHaveTextContent('/trips/7?tab=finanzplan')
  })

  it('FE-PAGE-COSTS-005: says when a trip could not be converted', async () => {
    const data = buildCostsOverview({ unconverted_trip_ids: [7], total: 406.5 })
    data.trips[0] = { ...data.trips[0]!, display_total: null, categories: [] }
    server.use(http.get('/api/costs/overview', () => HttpResponse.json(data)))
    renderPage()

    expect(await screen.findByText('No exchange rate')).toBeInTheDocument()
    expect(screen.getByText(/No exchange rate to EUR was available for some trips/)).toBeInTheDocument()
  })

  it('FE-PAGE-COSTS-006: an empty overview shows the empty state', async () => {
    server.use(http.get('/api/costs/overview', () => HttpResponse.json(buildCostsOverview({ trips: [], total: 0, categories: [] }))))
    renderPage()

    expect(await screen.findByText('You have no trips yet.')).toBeInTheDocument()
  })

  it('FE-PAGE-COSTS-007: a failed load offers a retry that loads again', async () => {
    let calls = 0
    server.use(http.get('/api/costs/overview', () => {
      calls += 1
      return calls === 1 ? HttpResponse.json({ error: 'boom' }, { status: 500 }) : HttpResponse.json(buildCostsOverview())
    }))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('The cost overview could not be loaded.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: 'Open the costs of Tokyo' })).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('FE-PAGE-COSTS-008: offline, it says a connection is needed', async () => {
    setForcedOffline(true)
    renderPage()

    await waitFor(() => expect(screen.getByText('The cost overview needs a connection.')).toBeInTheDocument())
  })
})
