import { useNavigate } from 'react-router'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { CostCategory } from '@trek/shared'
import { useTranslation } from '../../../i18n'
import { useCostsOverview } from '../../../pages/costs/useCostsOverview'
import type { OverviewTripRow } from '../../../pages/costs/costsOverviewModel'
import { COST_CAT_META } from '../../../components/Budget/costsCategories'
import MGlassBar from '../../components/MGlassBar'
import MIconBtn from '../../components/MIconBtn'
import MToggle from '../../components/MToggle'
import MDancingTrek from '../../components/MDancingTrek'

type T = (key: string, params?: Record<string, string | number>) => string

/**
 * Phone screen of the cost overview (/costs, #2): the global total first, then one
 * card row per trip. Data, the "by category" switch and navigation come from the
 * same useCostsOverview hook the desktop page wires up; only the markup differs.
 */
export default function MCostsOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, view, byCategory, setByCategory, retry, openTrip } = useCostsOverview()

  return (
    <>
      <MGlassBar>
        <MIconBtn ariaLabel={t('common.back')} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} strokeWidth={2} />
        </MIconBtn>
        <h1 className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-m-ink">{t('costsOverview.title')}</h1>
        <MToggle checked={byCategory} onChange={setByCategory} ariaLabel={t('costsOverview.byCategory')} />
      </MGlassBar>

      <div className="px-4 pb-[calc(var(--bottom-nav-h)+24px)] pt-[calc(var(--m-safe-top,12px)+66px)]">
        {status === 'loading' && !view && (
          <div className="flex justify-center py-14">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--m-trackoff)] border-t-[color:var(--m-ink)]" />
          </div>
        )}

        {(status === 'offline' || status === 'error') && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
            <MDancingTrek scene="costs" mood="sad" />
            <p className="font-geist text-[0.8125rem] font-medium text-m-muted">
              {t(status === 'offline' ? 'costsOverview.offline' : 'costsOverview.error')}
            </p>
            <button type="button" onClick={retry} className="rounded-full bg-m-act px-4 py-2 text-[0.8125rem] font-semibold text-m-actfg">
              {t('costsOverview.retry')}
            </button>
          </div>
        )}

        {status === 'ready' && view && view.rows.length === 0 && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <MDancingTrek scene="costs" className="mb-2" />
            <p className="font-geist text-[0.8125rem] font-medium text-m-muted">{t('costsOverview.empty')}</p>
          </div>
        )}

        {status === 'ready' && view && view.rows.length > 0 && (
          <>
            <section className="rounded-[20px] border border-[color:var(--m-cbr)] bg-[color:var(--m-card)] px-[14px] py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.8125rem] font-semibold text-m-muted">{t('costsOverview.allTrips')}</span>
                <span className="font-geist text-[1.25rem] font-bold tabular-nums text-m-ink">{view.totals.amount}</span>
              </div>
              {view.totals.open && <p className="text-right text-[0.6875rem] font-semibold text-warning">{t('installments.openAmount', { amount: view.totals.open })}</p>}
              <p className="mt-0.5 text-[0.75rem] text-m-faint">{t('costsOverview.subtitle', { currency: view.currency })}</p>
              {byCategory && view.totals.categories.map(c => (
                <CategoryLine key={c.category} category={c.category} amount={c.amount} original={null} t={t} />
              ))}
            </section>

            {view.incomplete && (
              <p className="mt-2 px-1 text-[0.75rem] text-m-muted">{t('costsOverview.unconverted', { currency: view.currency })}</p>
            )}

            <div className="mt-3 overflow-hidden rounded-[20px] border border-[color:var(--m-cbr)] bg-[color:var(--m-card)]">
              {view.rows.map(row => (
                <TripCard key={row.tripId} row={row} byCategory={byCategory} onOpen={openTrip} t={t} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function CategoryLine({ category, amount, original, t }: {
  category: CostCategory
  amount: string | null
  original: string | null
  t: T
}) {
  const meta = COST_CAT_META[category]
  return (
    <div className="mt-2 flex items-center gap-2 text-[0.8125rem]">
      <meta.Icon size={14} strokeWidth={2} className="flex-none" style={{ color: meta.color }} />
      <span className="min-w-0 flex-1 truncate text-m-muted">{t(meta.labelKey)}</span>
      <span className="text-right tabular-nums text-m-ink">
        {amount ?? t('costsOverview.noRate')}
        {original && <span className="block text-[0.6875rem] text-m-faint">{original}</span>}
      </span>
    </div>
  )
}

function TripCard({ row, byCategory, onOpen, t }: {
  row: OverviewTripRow
  byCategory: boolean
  onOpen: (tripId: number) => void
  t: T
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.tripId)}
      aria-label={t('costsOverview.openTrip', { trip: row.title })}
      className="block w-full border-b border-[color:var(--m-rowbr)] px-[14px] py-3 text-left last:border-b-0 active:bg-[color:var(--m-ic)]"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.875rem] font-semibold text-m-ink">{row.title}</div>
          <div className="truncate text-[0.75rem] text-m-muted">
            {[row.dates, row.archived ? t('costsOverview.archived') : null, `${t('costsOverview.expenses')}: ${row.itemCount}`]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <div className="text-right tabular-nums">
          <div className="text-[0.875rem] font-semibold text-m-ink">{row.amount ?? t('costsOverview.noRate')}</div>
          {row.original && <div className="text-[0.6875rem] text-m-faint">{row.original}</div>}
          {row.open && <div data-testid="m-overview-open" className="text-[0.6875rem] font-semibold text-warning">{t('installments.openAmount', { amount: row.open })}</div>}
        </div>
        <ChevronRight size={16} strokeWidth={2} className="flex-none text-m-faint" />
      </div>
      {byCategory && row.categories.map(c => (
        <CategoryLine key={c.category} category={c.category} amount={c.amount} original={c.original} t={t} />
      ))}
    </button>
  )
}
