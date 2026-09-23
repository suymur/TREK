import { useNavigate } from 'react-router'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { CostCategory } from '@trek/shared'
import { useTranslation } from '../../../i18n'
import { useCostsOverview } from '../../../pages/costs/useCostsOverview'
import type { OverviewPersonColumn, OverviewSplit, OverviewTripRow } from '../../../pages/costs/costsOverviewModel'
import { COST_CAT_META } from '../../../components/Budget/costsCategories'
import RingAvatar from '../../../components/Budget/BudgetPanelRingAvatar'
import MGlassBar from '../../components/MGlassBar'
import MIconBtn from '../../components/MIconBtn'
import MToggle from '../../components/MToggle'
import MDancingTrek from '../../components/MDancingTrek'

type T = (key: string, params?: Record<string, string | number>) => string

/**
 * Phone screen of the cost overview (/costs, #2): the two switches, the global
 * total, then one card row per trip. "Per person" lists each participant under
 * every figure instead of the desktop's columns. Data, the "by category" switch and navigation come from the
 * same useCostsOverview hook the desktop page wires up; only the markup differs.
 */
export default function MCostsOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, view, byCategory, setByCategory, perPerson, setPerPerson, retry, openTrip } = useCostsOverview()
  const split: SplitOpts | null = perPerson && view ? { people: view.people, showUnassigned: view.showUnassigned } : null

  return (
    <>
      <MGlassBar>
        <MIconBtn ariaLabel={t('common.back')} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} strokeWidth={2} />
        </MIconBtn>
        <h1 className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-m-ink">{t('costsOverview.title')}</h1>
      </MGlassBar>

      <div className="px-4 pb-[calc(var(--bottom-nav-h)+24px)] pt-[calc(var(--m-safe-top,12px)+66px)]">
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          <SwitchRow label={t('costsOverview.byCategory')} checked={byCategory} onChange={setByCategory} />
          <SwitchRow label={t('costsOverview.perPerson', { count: view?.people.length ?? 0 })} checked={perPerson} onChange={setPerPerson} />
        </div>
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
                <span className="text-right"><span className="block text-[0.6875rem] text-m-faint">{t('costsOverview.final')}</span><span className="block font-geist text-[1.25rem] font-bold tabular-nums text-m-ink">{view.totals.amount}</span></span>
              </div>
              <p className="mt-0.5 text-[0.75rem] text-m-faint">{t('costsOverview.estimated')}: {view.totals.estimated}</p>
              <SplitLines split={view.totals} opts={split} t={t} />
              {byCategory && view.totals.categories.map(c => (
                <CategoryLine key={c.category} category={c.category} amount={c.amount} original={null} estimated={c.estimated} estimatedOriginal={null} split={c} opts={split} t={t} />
              ))}
            </section>

            {view.incomplete && (
              <p className="mt-2 px-1 text-[0.75rem] text-m-muted">{t('costsOverview.unconverted', { currency: view.currency })}</p>
            )}

            <div className="mt-3 overflow-hidden rounded-[20px] border border-[color:var(--m-cbr)] bg-[color:var(--m-card)]">
              {view.rows.map(row => (
                <TripCard key={row.tripId} row={row} byCategory={byCategory} split={split} onOpen={openTrip} t={t} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

/** The per-person columns when "Per person" is on. */
interface SplitOpts {
  people: OverviewPersonColumn[]
  showUnassigned: boolean
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-m-muted">
      <MToggle checked={checked} onChange={onChange} ariaLabel={label} />
      {label}
    </span>
  )
}

/** One small line per person (and the unassigned rest) under a figure; "–" where the person has no share. */
function SplitLines({ split, opts, t }: { split: OverviewSplit; opts: SplitOpts | null; t: T }) {
  if (!opts) return null
  return (
    <div className="mt-1.5 space-y-1 border-l-2 border-[color:var(--m-rowbr)] pl-2.5">
      {opts.people.map((p, i) => (
        <div key={p.userId} className="flex items-center gap-2 text-[0.75rem]">
          <RingAvatar userId={p.userId} username={p.name} avatarUrl={p.avatarUrl} size={18} innerBg="var(--m-card)" textColor="var(--m-ink)" />
          <span className="min-w-0 flex-1 truncate text-m-muted">{p.name}</span>
          <span className="tabular-nums text-m-ink">{split.people[i] ?? '–'}</span>
        </div>
      ))}
      {opts.showUnassigned && (
        <div className="flex items-center gap-2 text-[0.75rem]">
          <span className="min-w-0 flex-1 truncate text-m-faint">{t('costsOverview.unassigned')}</span>
          <span className="tabular-nums text-m-ink">{split.unassigned}</span>
        </div>
      )}
    </div>
  )
}

function CategoryLine({ category, amount, original, estimated, estimatedOriginal, split, opts, t }: {
  category: CostCategory
  amount: string | null
  original: string | null
  estimated: string | null
  estimatedOriginal: string | null
  split: OverviewSplit
  opts: SplitOpts | null
  t: T
}) {
  const meta = COST_CAT_META[category]
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-[0.8125rem]">
        <meta.Icon size={14} strokeWidth={2} className="flex-none" style={{ color: meta.color }} />
        <span className="min-w-0 flex-1 truncate text-m-muted">{t(meta.labelKey)}</span>
        <span className="text-right tabular-nums text-m-ink">
          {amount ?? t('costsOverview.noRate')}
          {original && <span className="block text-[0.6875rem] text-m-faint">{original}</span>}
          <span className="block text-[0.6875rem] text-m-faint">{t('costsOverview.estimated')}: {estimated ?? t('costsOverview.noRate')}</span>
          {estimatedOriginal && <span className="block text-[0.6875rem] text-m-faint">{estimatedOriginal}</span>}
        </span>
      </div>
      <SplitLines split={split} opts={opts} t={t} />
    </div>
  )
}

function TripCard({ row, byCategory, split, onOpen, t }: {
  row: OverviewTripRow
  byCategory: boolean
  split: SplitOpts | null
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
          <div className="text-[0.875rem] font-semibold text-m-ink">{t('costsOverview.final')}: {row.amount ?? t('costsOverview.noRate')}</div>
          {row.original && <div className="text-[0.6875rem] text-m-faint">{row.original}</div>}
          <div className="text-[0.6875rem] text-m-faint">{t('costsOverview.estimated')}: {row.estimated ?? t('costsOverview.noRate')}</div>
          {row.estimatedOriginal && <div className="text-[0.6875rem] text-m-faint">{row.estimatedOriginal}</div>}
        </div>
        <ChevronRight size={16} strokeWidth={2} className="flex-none text-m-faint" />
      </div>
      <SplitLines split={row} opts={split} t={t} />
      {byCategory && row.categories.map(c => (
        <CategoryLine key={c.category} category={c.category} amount={c.amount} original={c.original} estimated={c.estimated} estimatedOriginal={c.estimatedOriginal} split={c} opts={split} t={t} />
      ))}
    </button>
  )
}
