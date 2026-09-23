import { describe, it, expect, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/helpers/msw/server'
import { setForcedOffline } from '../sync/networkMode'
import { costsOverviewRepo, CostsOverviewOfflineError } from './costsOverviewRepo'

const empty = { currency: 'EUR', trips: [], total: 0, categories: [], unconverted_trip_ids: [] }

afterEach(() => setForcedOffline(false))

describe('costsOverviewRepo.load', () => {
  it('returns the parsed overview', async () => {
    server.use(http.get('/api/costs/overview', () => HttpResponse.json(empty)))
    await expect(costsOverviewRepo.load()).resolves.toEqual(empty)
  })

  it('rejects a response that does not match the contract', async () => {
    server.use(http.get('/api/costs/overview', () => HttpResponse.json({ currency: 'EUR' })))
    await expect(costsOverviewRepo.load()).rejects.toThrow()
  })

  it('refuses before any request while offline', async () => {
    setForcedOffline(true)
    await expect(costsOverviewRepo.load()).rejects.toBeInstanceOf(CostsOverviewOfflineError)
  })
})
