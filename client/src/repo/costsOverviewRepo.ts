import { costsOverviewResponseSchema, type CostsOverviewResponse } from '@trek/shared'
import { costsOverviewApi } from '../api/costsOverview'
import { isEffectivelyOffline } from '../sync/networkMode'

/**
 * The cross-trip cost overview (#2).
 *
 * **Deliberately online-only, and no Dexie table.** The figures are a server
 * aggregate converted with today's exchange rates; a cached copy would show
 * yesterday's conversion next to today's expenses, and each trip's own Costs tab
 * already works offline from its cached items. Same shape as `dawarichRepo`.
 *
 * The response is parsed against the shared schema rather than cast.
 */

/** Thrown before a request is made when the device is offline by choice or by circumstance. */
export class CostsOverviewOfflineError extends Error {
  constructor() {
    super('The cost overview needs a connection')
    this.name = 'CostsOverviewOfflineError'
  }
}

export const costsOverviewRepo = {
  async load(signal?: AbortSignal): Promise<CostsOverviewResponse> {
    if (isEffectivelyOffline()) throw new CostsOverviewOfflineError()
    return costsOverviewResponseSchema.parse(await costsOverviewApi.get(signal))
  },
}
