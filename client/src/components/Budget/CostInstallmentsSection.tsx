import { Check, Plus, Trash2 } from 'lucide-react'
import { INSTALLMENT_LABEL_MAX } from '@trek/shared'
import { useTranslation } from '../../i18n'
import { formatMoney, localizeAmountInput } from '../../utils/formatters'
import { CustomDatePicker } from '../shared/CustomDateTimePicker'
import { NumericInput } from '../shared/NumericInput'
import { InstallmentSummaryLine } from './InstallmentsChip'
import type { InstallmentDraftsState } from './useInstallmentDrafts'
import { DepositRemainder, DepositSharesEditor, type DepositPerson } from './DepositSharesEditor'
import type { ExpenseShares } from '../../utils/budgetInstallments'

/**
 * The "Installments" block of the desktop expense dialog (fork #6): a deposit
 * now, the remainder later. Markup only; the rows live in useInstallmentDrafts
 * and are saved with the expense.
 */
export function CostInstallmentsSection({ state, currency, total, people, fullShares, labelCls }: {
  state: InstallmentDraftsState
  currency: string
  total: number
  people: DepositPerson[]
  fullShares: ExpenseShares
  labelCls: string
}) {
  const { t, locale } = useTranslation()
  const { drafts, add, remove, update, togglePaid, exceeds, summary, sum } = state
  const fieldCls = 'bg-surface-input border border-edge text-content'
  const small = { fontSize: 'calc(12px * var(--fs-scale-body, 1))' }

  return (
    <div className="mt-4 border-t border-edge pt-3" data-testid="installments-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <label className={labelCls} style={{ marginBottom: 0 }}>{t('installments.title')}</label>
        <button type="button" onClick={add} className="text-content-muted"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'calc(11.5px * var(--fs-scale-caption, 1))', fontWeight: 600, textDecoration: 'underline' }}>
          <Plus size={13} /> {t('installments.add')}
        </button>
      </div>
      {drafts.length === 0 ? (
        <div className="text-content-faint" style={small}>{t('installments.hint')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {drafts.map(d => (
            <div key={d.key} data-testid="installment-row" className="rounded-lg border border-edge bg-surface-secondary p-2">
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px 150px auto auto', gap: 8, alignItems: 'center' }}>
              <input value={d.label} maxLength={INSTALLMENT_LABEL_MAX} onChange={e => update(d.key, { label: e.target.value })}
                placeholder={t('installments.labelPlaceholder')} aria-label={t('installments.label')}
                className={fieldCls} style={{ borderRadius: 8, padding: '7px 9px', outline: 'none', minWidth: 0, ...small }} />
              <NumericInput mode="decimal" value={localizeAmountInput(d.amount, currency)} onValueChange={v => update(d.key, { amount: v })}
                placeholder={localizeAmountInput('0.00', currency)} aria-label={t('installments.amount')} data-testid="installment-amount"
                className={fieldCls} style={{ borderRadius: 8, padding: '7px 9px', outline: 'none', textAlign: 'right', width: '100%', ...small }} />
              <CustomDatePicker value={d.due_date || ''} onChange={v => update(d.key, { due_date: v || null })}
                placeholder={t('installments.dueDate')} style={{ width: '100%' }} />
              <button type="button" onClick={() => togglePaid(d.key)} aria-pressed={!!d.paid_at} data-testid="installment-paid"
                title={d.paid_at ? t('installments.markOpen') : t('installments.markPaid')}
                className={d.paid_at ? 'bg-success-soft text-success border border-edge' : 'bg-surface-card text-content-muted border border-edge'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 9px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap', ...small }}>
                <Check size={13} /> {t('installments.paid')}
              </button>
              <button type="button" onClick={() => remove(d.key)} aria-label={t('installments.remove')} title={t('installments.remove')}
                className="text-content-faint" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'grid', placeItems: 'center' }}>
                <Trash2 size={14} />
              </button>
              </div>
              <DepositSharesEditor state={state} draftKey={d.key} people={people.filter(person => person.id in fullShares)} currency={currency} />
            </div>
          ))}
        </div>
      )}
      {summary && <InstallmentSummaryLine summary={summary} currency={currency} style={{ marginTop: 10 }} />}
      {drafts.length > 0 && <DepositRemainder state={state} people={people} fullShares={fullShares} total={total} currency={currency} />}
      {exceeds && (
        <div role="alert" className="text-danger" style={{ marginTop: 6, ...small }}>
          {t('installments.overTotal', { sum: formatMoney(sum, currency, locale), total: formatMoney(total, currency, locale) })}
        </div>
      )}
      {state.invalidSplit && drafts.length > 0 && <div role="alert" className="mt-2 text-sm text-danger">{t('installments.splitInvalid')}</div>}
    </div>
  )
}
