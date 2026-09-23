import type { CSSProperties } from 'react'
import { CalendarClock } from 'lucide-react'
import type { BudgetItem } from '@trek/shared'
import { useTranslation } from '../../i18n'
import { formatDate, formatMoney } from '../../utils/formatters'
import { installmentSummary, type InstallmentSummary } from '../../utils/budgetInstallments'

/**
 * "Paid 1,000 of 3,000 · next due 1 Oct" (fork #6). One line, used under the
 * installment rows of both expense dialogs.
 */
export function InstallmentSummaryLine({ summary, currency, style }: { summary: InstallmentSummary; currency: string; style?: CSSProperties }) {
  const { t, locale } = useTranslation()
  const money = (n: number) => formatMoney(n, currency, locale)
  return (
    <div data-testid="installments-summary" className="text-content-muted" style={{ fontSize: 'calc(12px * var(--fs-scale-body, 1))', display: 'flex', flexWrap: 'wrap', gap: '2px 10px', ...style }}>
      <span className="text-content" style={{ fontWeight: 600 }}>{t('installments.paidOf', { paid: money(summary.paid), total: money(summary.total) })}</span>
      {summary.nextDue && <span>{t('installments.nextDue', { date: formatDate(summary.nextDue, locale) ?? summary.nextDue })}</span>}
      {summary.unscheduled > 0 && <span className="text-content-faint">{t('installments.unscheduled', { amount: money(summary.unscheduled) })}</span>}
    </div>
  )
}

/**
 * The small "paid X of Y" chip on an expense row, desktop and phone alike.
 * Nothing for an expense without installments: that one is paid in full.
 * `currency` is the expense's own (the trip currency when it has none).
 */
export function InstallmentsChip({ item, currency }: { item: BudgetItem; currency: string }) {
  const { t, locale } = useTranslation()
  const summary = installmentSummary(item)
  if (!summary) return null
  const money = (n: number) => formatMoney(n, currency, locale)
  const done = summary.open === 0
  const title = summary.nextDue ? t('installments.nextDue', { date: formatDate(summary.nextDue, locale) ?? summary.nextDue }) : undefined
  return (
    <span data-testid="installments-chip" title={title}
      className={done ? 'bg-success-soft text-success border border-edge' : 'bg-surface-secondary text-content-muted border border-edge'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 8px', borderRadius: 999, fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
      <CalendarClock size={11} />
      {t('installments.paidOf', { paid: money(summary.paid), total: money(summary.total) })}
    </span>
  )
}
