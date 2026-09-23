import { useTranslation } from '../../i18n'
import { formatMoney, localizeAmountInput } from '../../utils/formatters'
import type { ExpenseShares } from '../../utils/budgetInstallments'
import type { InstallmentDraftsState } from './useInstallmentDrafts'

export interface DepositPerson { id: number; name: string }

/** The same per-deposit allocation and calculated remainder in both expense editors. */
export function DepositSharesEditor({ state, draftKey, people, currency, mobile = false }: {
  state: InstallmentDraftsState
  draftKey: string
  people: DepositPerson[]
  currency: string
  mobile?: boolean
}) {
  const { t } = useTranslation()
  const shares = state.split.allocations[draftKey] || {}
  const draft = state.drafts.find(row => row.key === draftKey)
  return (
    <div className={mobile ? 'mt-2 space-y-1.5' : 'mt-2 grid gap-1.5'} data-testid="deposit-shares">
      {people.map(person => (
        <label key={person.id} className={mobile ? 'flex items-center gap-2 text-[0.75rem] text-m-muted' : 'flex items-center gap-2 text-sm text-content-muted'}>
          <span className="min-w-0 flex-1 truncate">{person.name}</span>
          <input
            type="text" inputMode="decimal"
            aria-label={`${t('installments.amount')} – ${person.name}`}
            value={localizeAmountInput(draft?.manualMembers ? (draft.members?.[person.id] ?? '') : String(shares[person.id] ?? 0), currency)}
            onChange={event => state.setMember(draftKey, person.id, event.target.value)}
            className={mobile
              ? 'w-24 rounded-lg border border-[color:var(--m-rowbr)] bg-[color:var(--m-sheetop)] px-2 py-1 text-right text-m-ink'
              : 'w-28 rounded-lg border border-edge bg-surface-input px-2 py-1 text-right text-content'}
          />
        </label>
      ))}
    </div>
  )
}

export function DepositRemainder({ state, people, fullShares, total, currency, mobile = false }: {
  state: InstallmentDraftsState
  people: DepositPerson[]
  fullShares: ExpenseShares
  total: number
  currency: string
  mobile?: boolean
}) {
  const { t, locale } = useTranslation()
  const remaining = Math.max(0, Math.round(total * 100) - Math.round(state.sum * 100)) / 100
  const assigned = Object.values(state.split.remainder).reduce((sum, amount) => sum + amount, 0)
  const unassigned = Math.max(0, Math.round((remaining - assigned) * 100)) / 100
  return (
    <div data-testid="deposit-remainder" className={mobile
      ? 'mt-2 rounded-xl border border-[color:var(--m-rowbr)] bg-m-card p-3'
      : 'mt-2 rounded-lg border border-edge bg-surface-secondary p-3'}>
      <div className={mobile ? 'flex justify-between font-semibold text-m-ink' : 'flex justify-between font-semibold text-content'}>
        <span>{t('installments.remainder')}</span><span>{formatMoney(remaining, currency, locale)}</span>
      </div>
      {people.filter(person => person.id in fullShares).map(person => (
        <div key={person.id} className={mobile ? 'mt-1 flex justify-between text-[0.75rem] text-m-muted' : 'mt-1 flex justify-between text-sm text-content-muted'}>
          <span>{person.name}</span><span>{formatMoney(state.split.remainder[person.id] ?? 0, currency, locale)}</span>
        </div>
      ))}
      {unassigned > 0 && <div className={mobile ? 'mt-1 flex justify-between text-[0.75rem] text-m-muted' : 'mt-1 flex justify-between text-sm text-content-muted'}>
        <span>{t('installments.unassigned')}</span><span>{formatMoney(unassigned, currency, locale)}</span>
      </div>}
    </div>
  )
}
