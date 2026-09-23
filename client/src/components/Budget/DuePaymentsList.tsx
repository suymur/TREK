import { useCallback, useMemo } from 'react'
import { Check } from 'lucide-react'
import { useTripStore } from '../../store/tripStore'
import { useTranslation } from '../../i18n'
import { useToast } from '../shared/Toast'
import { formatDate, formatMoney } from '../../utils/formatters'
import { duePayments, type DuePayment } from '../../utils/budgetInstallments'
import { localToday } from '../Planner/today'

/** How many open installments the Costs tab lists before it says "N more". */
const DUE_LIST_MAX = 6

/**
 * The trip's open installments for the "Due payments" card (fork #6), earliest
 * due day first, and the one-tap "mark paid" (today, in the viewer's clock).
 * `hasInstallments` is false on a trip where no expense is split into
 * installments; the card is not shown there at all.
 */
export function useDuePayments(tripId: number) {
  const items = useTripStore(s => s.budgetItems)
  const setInstallmentPaid = useTripStore(s => s.setBudgetInstallmentPaid)
  const toast = useToast()
  const { t } = useTranslation()
  const rows = useMemo(() => duePayments(items, localToday()), [items])
  const hasInstallments = useMemo(() => items.some(i => (i.installments || []).length > 0), [items])
  const markPaid = useCallback((row: DuePayment) => {
    setInstallmentPaid(tripId, row.item.id, row.installment.id, localToday())
      .catch(() => toast.error(t('installments.markPaidFailed')))
  }, [setInstallmentPaid, tripId, toast, t])
  return { rows, hasInstallments, markPaid }
}

/**
 * The rows of the "Due payments" card, desktop and phone alike; each shell wraps
 * it in its own card. Amounts are in the expense's own currency (`tripCurrency`
 * for an expense that has none), because that is the currency the payment is due in.
 */
export function DuePaymentsList({ rows, markPaid, canEdit, tripCurrency }: {
  rows: DuePayment[]
  markPaid: (row: DuePayment) => void
  canEdit: boolean
  tripCurrency: string
}) {
  const { t, locale } = useTranslation()
  if (rows.length === 0) {
    return <div className="text-content-faint" style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))' }}>{t('installments.due.empty')}</div>
  }
  const shown = rows.slice(0, DUE_LIST_MAX)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="due-payments">
      {shown.map(row => {
        const { item, installment, overdue } = row
        const currency = (item.currency || tripCurrency).toUpperCase()
        return (
          <div key={installment.id} data-testid="due-payment-row" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}{installment.label ? ` · ${installment.label}` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))' }}>
                <span className={overdue ? 'text-danger' : 'text-content-muted'} style={{ fontWeight: overdue ? 700 : 500 }}>
                  {installment.due_date ? (formatDate(installment.due_date, locale) ?? installment.due_date) : t('installments.due.noDate')}
                </span>
                {overdue && (
                  <span data-testid="due-overdue" className="bg-danger-soft text-danger" style={{ padding: '0 6px', borderRadius: 999, fontWeight: 700 }}>
                    {t('installments.due.overdue')}
                  </span>
                )}
              </div>
            </div>
            <span className="text-content" style={{ fontSize: 'calc(13px * var(--fs-scale-body, 1))', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {formatMoney(installment.amount, currency, locale)}
            </span>
            {canEdit && (
              <button type="button" onClick={() => markPaid(row)} title={t('installments.markPaid')} aria-label={t('installments.markPaid')}
                data-testid="due-mark-paid"
                className="bg-surface-secondary border border-edge text-content-muted"
                style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
                <Check size={14} />
              </button>
            )}
          </div>
        )
      })}
      {rows.length > shown.length && (
        <div className="text-content-faint" style={{ fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))' }}>
          {t('installments.due.more', { count: rows.length - shown.length })}
        </div>
      )}
    </div>
  )
}

/**
 * The "Due payments" card of the desktop Costs tab: the title and the list,
 * nothing on a trip without installments. `cardCls`/`labelCls` are the tab's
 * own card and eyebrow classes, so it sits in the sidebar like its siblings.
 */
export function DuePaymentsCard({ tripId, tripCurrency, canEdit, cardCls, labelCls, padding }: {
  tripId: number
  tripCurrency: string
  canEdit: boolean
  cardCls: string
  labelCls: string
  padding: string | number
}) {
  const { t } = useTranslation()
  const { rows, hasInstallments, markPaid } = useDuePayments(tripId)
  if (!hasInstallments) return null
  return (
    <div className={cardCls} style={{ borderRadius: 22, padding }} data-testid="due-payments-card">
      <div className={labelCls} style={{ marginBottom: 14 }}>{t('installments.due.title')} · <span className="text-content">{rows.length}</span></div>
      <DuePaymentsList rows={rows} markPaid={markPaid} canEdit={canEdit} tripCurrency={tripCurrency} />
    </div>
  )
}
