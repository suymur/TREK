import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { CostCategoryKey } from '@trek/shared'
import { useTranslation } from '../i18n'
import PageShell from '../components/Layout/PageShell'
import EmptyState from '../components/shared/EmptyState'
import { Spinner } from '../components/shared/Spinner'
import { categoryLabel } from '../components/Budget/costsCategories'
import { useCostCategoryIndex } from '../components/Budget/useCostCategories'
import RingAvatar from '../components/Budget/BudgetPanelRingAvatar'
import { useCostsOverview } from './costs/useCostsOverview'
import type { OverviewSplit, OverviewTripRow, OverviewView } from './costs/costsOverviewModel'

type T = (key: string, params?: Record<string, string | number>) => string

/** /costs on desktop — the costs of every trip, one row each, with a global total (#2). */
export default function CostsOverviewPage(): React.ReactElement {
  const { t } = useTranslation()
  // Page = wiring container: loading, the "by category" switch and navigation live in the hook.
  const { status, view, byCategory, setByCategory, perPerson, setPerPerson, retry, openTrip } = useCostsOverview()

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
          <div className="flex items-center gap-4">
            <Toggle checked={byCategory} onChange={setByCategory} label={t('costsOverview.byCategory')} />
            <Toggle checked={perPerson} onChange={setPerPerson} label={t('costsOverview.perPerson', { count: view?.people.length ?? 0 })} />
          </div>
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
          <OverviewTable view={view} byCategory={byCategory} perPerson={perPerson} onOpen={openTrip} t={t} />
        )}
      </div>
    </PageShell>
  )
}

function Toggle({ checked, onChange, label }: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}): React.ReactElement {
  return (
    <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 cursor-pointer" />
      {label}
    </label>
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

/** Which split columns the table shows; null when "Per person" is off. */
interface SplitColumns {
  showUnassigned: boolean
}

/** The per-person cells of one line (and the unassigned cell), or nothing when the split is off. */
function SplitCells({ split, cols, strong = false }: {
  split: OverviewSplit
  cols: SplitColumns | null
  strong?: boolean
}): React.ReactElement | null {
  if (!cols) return null
  const cls = `px-3 text-right tabular-nums whitespace-nowrap ${strong ? 'font-medium text-content' : 'text-content-secondary'}`
  return (
    <>
      {split.people.map((cell, i) => (
        <td key={i} className={cls}>{cell ?? <span className="text-content-faint">–</span>}</td>
      ))}
      {cols.showUnassigned && <td className={cls}>{split.unassigned}</td>}
    </>
  )
}

function OverviewTable({ view, byCategory, perPerson, onOpen, t }: {
  view: OverviewView
  byCategory: boolean
  perPerson: boolean
  onOpen: (tripId: number) => void
  t: T
}): React.ReactElement {
  const cols: SplitColumns | null = perPerson ? { showUnassigned: view.showUnassigned } : null
  return (
    <>
      <div className="rounded-xl border overflow-x-auto border-edge bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-xs text-content-muted">
              <th scope="col" className="px-4 py-2 text-left font-medium">{t('costsOverview.trip')}</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">{t('costsOverview.expenses')}</th>
              {cols && view.people.map(p => (
                <th key={p.userId} scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <RingAvatar userId={p.userId} username={p.name} avatarUrl={p.avatarUrl} size={20} innerBg="var(--bg-card)" textColor="var(--text-primary)" />
                    {p.name}
                  </span>
                </th>
              ))}
              {cols?.showUnassigned && (
                <th scope="col" className="px-3 py-2 text-right font-medium">{t('costsOverview.unassigned')}</th>
              )}
              <th scope="col" className="px-4 py-2 text-right font-medium">{t('costsOverview.final')}</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">{t('costsOverview.estimated')}</th>
            </tr>
          </thead>
          {view.rows.map(row => (
            <TripRows key={row.tripId} row={row} byCategory={byCategory} cols={cols} onOpen={onOpen} t={t} />
          ))}
          <tfoot className="border-t-2 border-edge bg-surface-secondary">
            <tr>
              <th scope="row" className="px-4 py-3 text-left font-semibold text-content">{t('costsOverview.allTrips')}</th>
              <td />
              <SplitCells split={view.totals} cols={cols} strong />
              <td className="px-4 py-3"><Amount amount={view.totals.amount} original={null} t={t} strong /></td>
              <td className="px-4 py-3"><Amount amount={view.totals.estimated} original={null} t={t} strong /></td>
            </tr>
            {byCategory && view.totals.categories.map(c => (
              <tr key={c.category}>
                <td className="pl-8 pr-4 py-1.5"><CategoryName category={c.category} t={t} /></td>
                <td />
                <SplitCells split={c} cols={cols} />
                <td className="px-4 py-1.5"><Amount amount={c.amount} original={null} t={t} /></td>
                <td className="px-4 py-1.5"><Amount amount={c.estimated} original={null} t={t} /></td>
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

function TripRows({ row, byCategory, cols, onOpen, t }: {
  row: OverviewTripRow
  byCategory: boolean
  cols: SplitColumns | null
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
        <SplitCells split={row} cols={cols} strong />
        <td className="px-4 py-3"><Amount amount={row.amount} original={row.original} t={t} strong /></td>
        <td className="px-4 py-3"><Amount amount={row.estimated} original={row.estimatedOriginal} t={t} strong /></td>
      </tr>
      {byCategory && row.categories.map(c => (
        <tr key={c.category} className="cursor-pointer hover:bg-surface-hover" onClick={() => onOpen(row.tripId)}>
          <td className="pl-8 pr-4 py-1.5"><CategoryName category={c.category} t={t} /></td>
          <td />
          <SplitCells split={c} cols={cols} />
          <td className="px-4 py-1.5"><Amount amount={c.amount} original={c.original} t={t} /></td>
          <td className="px-4 py-1.5"><Amount amount={c.estimated} original={c.estimatedOriginal} t={t} /></td>
        </tr>
      ))}
    </tbody>
  )
}
