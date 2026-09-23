import { describe, expect, it } from 'vitest'
import type { BudgetItem, BudgetItemInstallment } from '@trek/shared'
import { depositSplitState, duePayments, draftsExceedTotal, draftsToInput, installmentSummary, withInstallmentPaid } from './budgetInstallments'

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

  it('splits each deposit independently and computes each person’s remaining amount', () => {
    const drafts = [
      { key: 'a', label: 'Deposit 1', amount: '200', due_date: null, paid_at: '2026-09-23', members: {}, manualMembers: false },
      { key: 'b', label: 'Deposit 2', amount: '100', due_date: null, paid_at: null, members: { 1: '0', 2: '100' }, manualMembers: true },
    ]
    const shares = { 1: 419.65, 2: 419.65 }
    const split = depositSplitState(drafts, shares)
    expect(split.valid).toBe(true)
    expect(split.allocations).toEqual({ a: { 1: 100, 2: 100 }, b: { 1: 0, 2: 100 } })
    expect(split.remainder).toEqual({ 1: 319.65, 2: 219.65 })
    expect(draftsToInput(drafts, shares).map(row => row.members)).toEqual([
      [{ user_id: 1, amount: 100 }, { user_id: 2, amount: 100 }],
      [{ user_id: 2, amount: 100 }],
    ])
    expect(depositSplitState([{ ...drafts[1]!, members: { 1: '0', 2: '500' } }], shares).valid).toBe(false)
  })

  it('reserves manual shares before automatically splitting earlier deposits', () => {
    const drafts = [
      { key: 'auto', label: 'First', amount: '60', due_date: null, paid_at: null, members: {}, manualMembers: false },
      { key: 'manual', label: 'Second', amount: '40', due_date: null, paid_at: null, members: { 1: '40', 2: '0' }, manualMembers: true },
    ]
    const split = depositSplitState(drafts, { 1: 50, 2: 50 })
    expect(split.valid).toBe(true)
    expect(split.allocations.auto).toEqual({ 1: 10, 2: 50 })
    expect(split.remainder).toEqual({ 1: 0, 2: 0 })
    expect(depositSplitState(drafts, {}).valid).toBe(false)
  })

  it('keeps planning-only deposits unallocated', () => {
    const draft = { key: 'planning', label: 'Deposit', amount: '30', due_date: null, paid_at: null, members: {}, manualMembers: false }
    expect(depositSplitState([draft], {}).valid).toBe(true)
    expect(draftsToInput([draft], {})[0]?.members).toEqual([])
  })
})
