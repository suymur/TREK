import { Check, Plus, Trash2 } from 'lucide-react'
import { INSTALLMENT_LABEL_MAX } from '@trek/shared'
import { useTranslation } from '../../../../i18n'
import { formatMoney, localizeAmountInput } from '../../../../utils/formatters'
import { CustomDatePicker } from '../../../../components/shared/CustomDateTimePicker'
import { NumericInput } from '../../../../components/shared/NumericInput'
import { InstallmentSummaryLine } from '../../../../components/Budget/InstallmentsChip'
import type { InstallmentDraftsState } from '../../../../components/Budget/useInstallmentDrafts'
import { DepositRemainder, DepositSharesEditor, type DepositPerson } from '../../../../components/Budget/DepositSharesEditor'
import type { ExpenseShares } from '../../../../utils/budgetInstallments'
import { Eyebrow, FIELD_CLS } from './PlSheetChrome'

/**
 * The "Installments" block of the phone expense sheet (fork #6). Markup only;
 * the rows live in useInstallmentDrafts, shared with the desktop dialog, and are
 * saved with the expense.
 */
export default function MCostInstallmentsSection({ state, currency, total, people, fullShares }: {
  state: InstallmentDraftsState
  currency: string
  total: number
  people: DepositPerson[]
  fullShares: ExpenseShares
}) {
  const { t, locale } = useTranslation()
  const { drafts, add, remove, update, togglePaid, exceeds, summary, sum } = state

  return (
    <div data-testid="m-installments-section" className="mt-4 border-t border-[color:var(--m-rowbr)] pt-2">
      <div className="mb-[6px] mt-4 flex items-center justify-between">
        <Eyebrow className="uppercase">{t('installments.title')}</Eyebrow>
        <button type="button" onClick={add} className="flex items-center gap-1 text-[0.75rem] font-semibold text-m-ink">
          <Plus size={13} strokeWidth={2.2} /> {t('installments.add')}
        </button>
      </div>
      {drafts.length === 0 && <p className="text-[0.65625rem] text-m-faint">{t('installments.hint')}</p>}
      <div className="flex flex-col gap-2">
        {drafts.map(d => (
          <div key={d.key} data-testid="m-installment-row"
            className="rounded-xl border border-[color:var(--m-rowbr)] bg-m-card p-[10px]">
            <div className="flex items-center gap-2">
              <input value={d.label} maxLength={INSTALLMENT_LABEL_MAX} onChange={e => update(d.key, { label: e.target.value })}
                placeholder={t('installments.labelPlaceholder')} aria-label={t('installments.label')}
                className={`${FIELD_CLS} min-w-0 flex-1`} />
              <button type="button" onClick={() => remove(d.key)} aria-label={t('installments.remove')} className="flex-none p-1 text-m-faint">
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <NumericInput mode="decimal" value={localizeAmountInput(d.amount, currency)} onValueChange={v => update(d.key, { amount: v })} data-testid="installment-amount"
                placeholder={localizeAmountInput('0.00', currency)} aria-label={t('installments.amount')}
                className={`${FIELD_CLS} w-[96px] flex-none text-right`} />
              <div className="min-w-0 flex-1">
                <CustomDatePicker value={d.due_date || ''} onChange={v => update(d.key, { due_date: v || null })}
                  placeholder={t('installments.dueDate')} style={{ width: '100%' }} />
              </div>
              <button type="button" onClick={() => togglePaid(d.key)} aria-pressed={!!d.paid_at}
                className={`flex flex-none items-center gap-1 rounded-full px-[10px] py-[7px] text-[0.6875rem] font-semibold ${d.paid_at ? 'bg-m-act text-m-actfg' : 'border border-[color:var(--m-rowbr)] text-m-muted'}`}>
                <Check size={12} strokeWidth={2.4} /> {t('installments.paid')}
              </button>
            </div>
            <DepositSharesEditor state={state} draftKey={d.key} people={people.filter(person => person.id in fullShares)} currency={currency} mobile />
          </div>
        ))}
      </div>
      {summary && <InstallmentSummaryLine summary={summary} currency={currency} style={{ marginTop: 8 }} />}
      {drafts.length > 0 && <DepositRemainder state={state} people={people} fullShares={fullShares} total={total} currency={currency} mobile />}
      {exceeds && (
        <p role="alert" className="mt-[5px] text-[0.6875rem] text-danger">
          {t('installments.overTotal', { sum: formatMoney(sum, currency, locale), total: formatMoney(total, currency, locale) })}
        </p>
      )}
      {state.invalidSplit && drafts.length > 0 && <p role="alert" className="mt-2 text-[0.75rem] text-danger">{t('installments.splitInvalid')}</p>}
    </div>
  )
}
