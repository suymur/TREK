import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { CostsOverviewResponse } from '@trek/shared'
import { useTranslation } from '../../i18n'
import { costsOverviewRepo, CostsOverviewOfflineError } from '../../repo/costsOverviewRepo'
import { buildOverviewView, costsTabPath, type CostsOverviewStatus } from './costsOverviewModel'
import { useCostCategorySync } from '../../components/Budget/useCostCategories'

/**
 * Data hook of the cost overview (#2), used by the desktop page and the phone
 * screen alike: loads the overview, keeps the "by category" switch, and opens a
 * trip's Costs tab.
 */
export function useCostsOverview() {
  const navigate = useNavigate()
  const { locale } = useTranslation()
  const [data, setData] = useState<CostsOverviewResponse | null>(null)
  const [status, setStatus] = useState<CostsOverviewStatus>('loading')
  const [byCategory, setByCategory] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Names, icons and colours of the custom categories the overview groups by (#4).
  useCostCategorySync()

  useEffect(() => {
    const ctrl = new AbortController()
    setStatus('loading')
    costsOverviewRepo
      .load(ctrl.signal)
      .then(result => {
        if (ctrl.signal.aborted) return
        setData(result)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        if (!(err instanceof CostsOverviewOfflineError)) console.error('[costs-overview] load failed', err)
        setStatus(err instanceof CostsOverviewOfflineError ? 'offline' : 'error')
      })
    return () => ctrl.abort()
  }, [attempt])

  const view = useMemo(() => (data ? buildOverviewView(data, locale) : null), [data, locale])
  const retry = useCallback(() => setAttempt(n => n + 1), [])
  const openTrip = useCallback((tripId: number) => navigate(costsTabPath(tripId)), [navigate])

  return { status, view, byCategory, setByCategory, retry, openTrip }
}
