import { describe, expect, it } from 'vitest'
import type { BudgetItem, BudgetItemInstallment } from '@trek/shared'
import { duePayments, draftsExceedTotal, draftsToInput, installmentSummary, withInstallmentPaid } from './budgetInstallments'

const installment = (id: number, amount: number, due_date: string | null, paid_at: string | null = null): BudgetItemInstallment => ({
  id, budget_item_id: 1, label: `Payment ${id}`, amount, due_date, paid_at, sort_order: id, members: [],
})

const item = (installments: BudgetItemInstallment[]): BudgetItem => ({
  id: 1, trip_id: 1, category: 'other', name: 'Hotel', total_price: 3000,
  installments, paid_amount: 1000, open_amount: 2000,
})

describe('expense installments', () => {
  it('shows a paid deposit, the remaining balance, and the next due day', () => {
    const expense = item([
      installment(1, 1000, '2026-09-01', '2026-09-02'),
      installment(2, 2000, '2026-10-01'),
    ])
    expect(installmentSummary(expense)).toMatchObject({ paid: 1000, total: 3000, open: 2000, nextDue: '2026-10-01' })
    expect(withInstallmentPaid(expense, 2, '2026-10-01')).toMatchObject({ paid_amount: 3000, open_amount: 0 })
    expect(expense.open_amount).toBe(2000)
  })

  it('sorts open payments by due day and marks earlier dates overdue', () => {
    const expense = item([
      installment(1, 1000, '2026-09-01', '2026-09-02'),
      installment(2, 1000, null),
      installment(3, 1000, '2026-09-20'),
    ])
    expect(duePayments([expense], '2026-09-23').map(row => [row.installment.id, row.overdue])).toEqual([
      [3, true], [2, false],
    ])
  })

  it('checks rounded cents like the server and preserves edits', () => {
    const drafts = [
      { key: 'id-1', id: 1, label: 'Deposit', amount: '0,10', due_date: null, paid_at: '2026-09-23' },
      { key: 'new-1', label: 'Remainder', amount: '0.20', due_date: '2026-10-01', paid_at: null },
    ]
    expect(draftsExceedTotal(drafts, 0.3)).toBe(false)
    expect(draftsExceedTotal(drafts, 0.29)).toBe(true)
    expect(draftsToInput(drafts)).toEqual([
      { id: 1, label: 'Deposit', amount: 0.1, due_date: null, paid_at: '2026-09-23' },
      { label: 'Remainder', amount: 0.2, due_date: '2026-10-01', paid_at: null },
    ])
  })
})
