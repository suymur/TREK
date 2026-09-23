import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { CostCategoryKey } from '@trek/shared'
import { useTranslation } from '../i18n'
import PageShell from '../components/Layout/PageShell'
import EmptyState from '../components/shared/EmptyState'
import { Spinner } from '../components/shared/Spinner'
import { categoryLabel } from '../components/Budget/costsCategories'
import { useCostCategoryIndex } from '../components/Budget/useCostCategories'
import { useCostsOverview } from './costs/useCostsOverview'
import type { OverviewTripRow, OverviewView } from './costs/costsOverviewModel'

type T = (key: string, params?: Record<string, string | number>) => string

/** /costs on desktop — the costs of every trip, one row each, with a global total (#2). */
export default function CostsOverviewPage(): React.ReactElement {
  const { t } = useTranslation()
  // Page = wiring container: loading, the "by category" switch and navigation live in the hook.
  const { status, view, byCategory, setByCategory, retry, openTrip } = useCostsOverview()

  return (
    <PageShell background="var(--bg-primary)">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-content">{t('costsOverview.title')}</h1>
            {view && (
              <p className="text-sm mt-0.5 text-content-muted">{t('costsOverview.subtitle', { currency: view.currency })}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={byCategory}
              onChange={e => setByCategory(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            {t('costsOverview.byCategory')}
          </label>
        </div>

        {status === 'loading' && !view && (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-6 h-6 border-2 border-edge border-t-current" />
          </div>
        )}
        {(status === 'offline' || status === 'error') && (
          <EmptyState
            scene="costs"
            mood="sad"
            title={t(status === 'offline' ? 'costsOverview.offline' : 'costsOverview.error')}
            action={
              <button type="button" onClick={retry} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-content text-surface">
                {t('costsOverview.retry')}
              </button>
            }
          />
        )}
        {status === 'ready' && view && view.rows.length === 0 && (
          <EmptyState scene="costs" title={t('costsOverview.empty')} />
        )}
        {status === 'ready' && view && view.rows.length > 0 && (
          <OverviewTable view={view} byCategory={byCategory} onOpen={openTrip} t={t} />
        )}
      </div>
    </PageShell>
  )
}

function CategoryName({ category, t }: { category: CostCategoryKey; t: T }): React.ReactElement {
  const meta = useCostCategoryIndex().meta(category)
  return (
    <span className="inline-flex items-center gap-2 text-content-secondary">
      <meta.Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
      {categoryLabel(meta, t)}
    </span>
  )
}

function Amount({ amount, original, t, strong = false }: {
  amount: string | null
  original: string | null
  t: T
  strong?: boolean
}): React.ReactElement {
  return (
    <div className="text-right tabular-nums">
      <div className={strong ? 'font-semibold text-content' : 'text-content'}>{amount ?? t('costsOverview.noRate')}</div>
      {original && <div className="text-xs text-content-faint">{original}</div>}
    </div>
  )
}

function OverviewTable({ view, byCategory, onOpen, t }: {
  view: OverviewView
  byCategory: boolean
  onOpen: (tripId: number) => void
  t: T
}): React.ReactElement {
  return (
    <>
      <div className="rounded-xl border overflow-hidden border-edge bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-xs text-content-muted">
              <th scope="col" className="px-4 py-2 text-left font-medium">{t('costsOverview.trip')}</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">{t('costsOverview.expenses')}</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">{t('costsOverview.total')}</th>
            </tr>
          </thead>
          {view.rows.map(row => (
            <TripRows key={row.tripId} row={row} byCategory={byCategory} onOpen={onOpen} t={t} />
          ))}
          <tfoot className="border-t-2 border-edge bg-surface-secondary">
            <tr>
              <th scope="row" className="px-4 py-3 text-left font-semibold text-content">{t('costsOverview.allTrips')}</th>
              <td />
              <td className="px-4 py-3"><Amount amount={view.totals.amount} original={null} t={t} strong /></td>
            </tr>
            {byCategory && view.totals.categories.map(c => (
              <tr key={c.category}>
                <td className="pl-8 pr-4 py-1.5"><CategoryName category={c.category} t={t} /></td>
                <td />
                <td className="px-4 py-1.5"><Amount amount={c.amount} original={null} t={t} /></td>
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
      {view.incomplete && (
        <p className="mt-3 text-xs text-content-muted">{t('costsOverview.unconverted', { currency: view.currency })}</p>
      )}
    </>
  )
}

function TripRows({ row, byCategory, onOpen, t }: {
  row: OverviewTripRow
  byCategory: boolean
  onOpen: (tripId: number) => void
  t: T
}): React.ReactElement {
  return (
    <tbody className="border-b border-edge last-of-type:border-b-0">
      <tr className="cursor-pointer hover:bg-surface-hover" onClick={() => onOpen(row.tripId)}>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onOpen(row.tripId) }}
            aria-label={t('costsOverview.openTrip', { trip: row.title })}
            className="flex items-center gap-1 text-left font-medium text-content hover:underline"
          >
            {row.title}
            <ChevronRight className="w-3.5 h-3.5 text-content-faint" />
          </button>
          <div className="flex items-center gap-2 text-xs text-content-muted">
            {row.dates && <span>{row.dates}</span>}
            {row.archived && (
              <span className="px-1.5 py-0.5 rounded bg-surface-hover text-content-secondary">{t('costsOverview.archived')}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-content-muted">{row.itemCount}</td>
        <td className="px-4 py-3"><Amount amount={row.amount} original={row.original} t={t} strong /></td>
      </tr>
      {byCategory && row.categories.map(c => (
        <tr key={c.category} className="cursor-pointer hover:bg-surface-hover" onClick={() => onOpen(row.tripId)}>
          <td className="pl-8 pr-4 py-1.5"><CategoryName category={c.category} t={t} /></td>
          <td />
          <td className="px-4 py-1.5"><Amount amount={c.amount} original={c.original} t={t} /></td>
        </tr>
      ))}
    </tbody>
  )
}
