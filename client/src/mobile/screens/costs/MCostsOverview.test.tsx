import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Routes, Route, useLocation } from 'react-router'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render, screen, within } from '../../../../tests/helpers/render'
import { server } from '../../../../tests/helpers/msw/server'
import { resetAllStores, seedStore } from '../../../../tests/helpers/store'
import { buildUser } from '../../../../tests/helpers/factories'
import { buildCostsOverview } from '../../../../tests/helpers/costsOverview'
import { useAuthStore } from '../../../store/authStore'
import { setForcedOffline } from '../../../sync/networkMode'
import { formatMoney } from '../../../utils/formatters'
import MCostsOverview from './MCostsOverview'

// Testing Library collapses the no-break space Intl puts before the symbol; the matcher has to as well.
const money = (v: number, cur: string) => formatMoney(v, cur, 'en-US').replace(/\s+/g, ' ')
const eur = (v: number) => money(v, 'EUR')

function TripProbe() {
  const location = useLocation()
  return <div data-testid="trip-location">{location.pathname + location.search}</div>
}

function renderScreen() {
  return render(
    <Routes>
      <Route path="/costs" element={<MCostsOverview />} />
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

describe('MCostsOverview', () => {
  it('FE-M-COSTS-001: shows the global total and one card per trip', async () => {
    renderScreen()

    expect(await screen.findByRole('button', { name: 'Open the costs of Tokyo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open the costs of Rome' })).toBeInTheDocument()
    expect(screen.getByText('All trips')).toBeInTheDocument()
    expect(screen.getByText(eur(506.5))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open the costs of Tokyo' })).toHaveTextContent(eur(100))
    expect(screen.queryByText('Transport')).not.toBeInTheDocument()
  })

  it('FE-M-COSTS-002: the switch splits the totals by category', async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole('button', { name: 'Open the costs of Tokyo' })

    await user.click(screen.getByRole('switch', { name: 'By category' }))

    expect(screen.getAllByText('Transport')).toHaveLength(2)
    expect(screen.getByText(eur(76))).toBeInTheDocument()
  })

  it('FE-M-COSTS-003: a tap on a trip opens its Costs tab', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: 'Open the costs of Tokyo' }))

    expect(screen.getByTestId('trip-location')).toHaveTextContent('/trips/7?tab=finanzplan')
  })

  it('FE-M-COSTS-004: offline, it offers a retry', async () => {
    setForcedOffline(true)
    renderScreen()

    expect(await screen.findByText('The cost overview needs a connection.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('FE-M-COSTS-005: an empty overview shows the empty state', async () => {
    server.use(http.get('/api/costs/overview', () => HttpResponse.json(buildCostsOverview({ trips: [], total: 0, categories: [] }))))
    renderScreen()

    expect(await screen.findByText('You have no trips yet.')).toBeInTheDocument()
  })

  it('FE-M-COSTS-006: the "Per person" switch lists each participant under every figure', async () => {
    const user = userEvent.setup()
    renderScreen()
    const rome = await screen.findByRole('button', { name: 'Open the costs of Rome' })
    expect(within(rome).queryByText('Alice')).not.toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'Per person (2)' }))

    // bob is not in Rome: a dash, not 0.
    const bobLine = within(rome).getByText('bob').parentElement!
    expect(bobLine).toHaveTextContent('–')
    expect(within(rome).getByText('Alice').parentElement).toHaveTextContent(eur(350.5))
    expect(within(rome).getByText('Unassigned').parentElement).toHaveTextContent(eur(56))
    // Global: Alice across both trips.
    expect(screen.getByText(eur(440.5))).toBeInTheDocument()
  })

  it('FE-M-COSTS-007: both switches together split each category per person', async () => {
    const user = userEvent.setup()
    renderScreen()
    const tokyo = await screen.findByRole('button', { name: 'Open the costs of Tokyo' })

    await user.click(screen.getByRole('switch', { name: 'Per person (2)' }))
    await user.click(screen.getByRole('switch', { name: 'By category' }))

    // Trip line + food + transport, each with an Alice line.
    expect(within(tokyo).getAllByText('Alice')).toHaveLength(3)
  })
})
