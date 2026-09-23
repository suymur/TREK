import type { BudgetInstallmentInput, BudgetItem, BudgetItemInstallment } from '@trek/shared'

/**
 * Installments of an expense (fork #6): the pure half, shared by the desktop
 * dialog, the phone sheet and the "Due payments" lists. No React here.
 *
 * Money is added in whole cents, the rule the server applies too, so the
 * dialog refuses exactly the lists the server would refuse.
 */

const toCents = (n: number) => Math.round(n * 100)

/** One installment row while the dialog edits it. `amount` is the raw input text. */
export interface InstallmentDraft {
  /** Stable React key; the server id for a saved row, a local counter for a new one. */
  key: string
  id?: number
  label: string
  amount: string
  due_date: string | null
  paid_at: string | null
  /** Explicit per-person deposit shares; new rows begin with an automatic split. */
  members?: Record<number, string>
  manualMembers?: boolean
}

export type ExpenseShares = Record<number, number>
export type DepositShares = Record<number, number>
export type DepositInput = BudgetInstallmentInput & { members?: { user_id: number; amount: number }[] }

let draftCounter = 0
const newKey = () => `new-${++draftCounter}`

export function draftsFromItem(item: Pick<BudgetItem, 'installments'> | null | undefined): InstallmentDraft[] {
  return (item?.installments || []).map(i => ({
    key: `id-${i.id}`,
    id: i.id,
    label: i.label,
    amount: String(i.amount),
    due_date: i.due_date,
    paid_at: i.paid_at,
    members: Object.fromEntries(((i as BudgetItemInstallment & { members?: { user_id: number; amount: number }[] }).members || [])
      .map(member => [member.user_id, String(member.amount)])),
    manualMembers: !!(i as BudgetItemInstallment & { members?: { user_id: number; amount: number }[] }).members?.length,
  }))
}

export function emptyDraft(): InstallmentDraft {
  return { key: newKey(), label: '', amount: '', due_date: null, paid_at: null, members: {}, manualMembers: false }
}

/** The input text as a number; a comma decimal counts like a point. */
export function draftAmount(d: Pick<InstallmentDraft, 'amount'>): number {
  const n = Number.parseFloat(d.amount.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Rows without a positive amount say nothing and are not sent. */
export function draftsToInput(drafts: InstallmentDraft[], fullShares?: ExpenseShares): DepositInput[] {
  const allocations = fullShares ? depositAllocations(drafts, fullShares) : null
  return drafts
    .filter(d => toCents(draftAmount(d)) > 0)
    .map(d => ({
      ...(d.id !== undefined ? { id: d.id } : {}),
      label: d.label.trim(),
      amount: Math.round(draftAmount(d) * 100) / 100,
      due_date: d.due_date || null,
      paid_at: d.paid_at || null,
      ...(allocations ? { members: Object.entries(allocations[d.key] || {})
        .filter(([, amount]) => amount > 0)
        .map(([user_id, amount]) => ({ user_id: Number(user_id), amount })) } : {}),
    }))
}

/** Allocate one deposit across the unused whole-cent shares, filling capped people evenly. */
function automaticAllocation(amountCents: number, available: Map<number, number>): DepositShares {
  const result = new Map<number, number>()
  let left = amountCents
  while (left > 0) {
    const active = [...available].filter(([, cents]) => cents > 0)
    if (active.length === 0) break
    const each = Math.floor(left / active.length)
    let extra = left % active.length
    let assigned = 0
    for (const [id, capacity] of active) {
      const wanted = each + (extra > 0 ? 1 : 0)
      if (extra > 0) extra--
      const take = Math.min(capacity, wanted)
      result.set(id, (result.get(id) ?? 0) + take)
      available.set(id, capacity - take)
      assigned += take
    }
    if (assigned === 0) break
    left -= assigned
  }
  return Object.fromEntries([...result].map(([id, cents]) => [id, cents / 100]))
}

/** Per-deposit shares, with unedited deposits split automatically within each person's full expense share. */
export function depositAllocations(drafts: InstallmentDraft[], fullShares: ExpenseShares): Record<string, DepositShares> {
  const available = new Map(Object.entries(fullShares).map(([id, amount]) => [Number(id), Math.max(0, toCents(amount))]))
  const allocations: Record<string, DepositShares> = {}
  for (const draft of drafts) {
    if (draft.manualMembers) {
      const shares = Object.fromEntries(Object.entries(draft.members || {}).map(([id, amount]) => [Number(id), draftAmount({ amount })]))
      allocations[draft.key] = shares
      for (const [id, amount] of Object.entries(shares)) available.set(Number(id), (available.get(Number(id)) ?? 0) - toCents(amount))
    }
  }
  for (const draft of drafts) {
    if (!draft.manualMembers) allocations[draft.key] = automaticAllocation(Math.max(0, toCents(draftAmount(draft))), available)
  }
  return allocations
}

export function depositSplitState(drafts: InstallmentDraft[], fullShares: ExpenseShares): {
  allocations: Record<string, DepositShares>
  remainder: DepositShares
  valid: boolean
} {
  const allocations = depositAllocations(drafts, fullShares)
  if (!drafts.some(draft => toCents(draftAmount(draft)) > 0)) {
    return { allocations, remainder: { ...fullShares }, valid: true }
  }
  const used = new Map<number, number>()
  let valid = true
  for (const draft of drafts) {
    const amount = toCents(draftAmount(draft))
    if (amount <= 0) continue
    const shares = allocations[draft.key] || {}
    const allocated = Object.entries(shares).reduce((sum, [id, value]) => {
      const cents = toCents(value)
      if (!(Number(id) in fullShares) || cents < 0) valid = false
      used.set(Number(id), (used.get(Number(id)) ?? 0) + cents)
      return sum + cents
    }, 0)
    if (Object.keys(fullShares).length > 0 && allocated !== amount) valid = false
  }
  const remainder = Object.fromEntries(Object.entries(fullShares).map(([id, amount]) => {
    const cents = toCents(amount) - (used.get(Number(id)) ?? 0)
    if (cents < 0) valid = false
    return [Number(id), cents / 100]
  }))
  return { allocations, remainder, valid }
}

/** Sum of the drafts that would be sent, in whole cents. */
export function draftsSumCents(drafts: InstallmentDraft[]): number {
  return draftsToInput(drafts).reduce((a, i) => a + toCents(i.amount), 0)
}

/** The server refuses a list over the total; the dialog stops before that. */
export function draftsExceedTotal(drafts: InstallmentDraft[], total: number): boolean {
  const sum = draftsSumCents(drafts)
  return sum > 0 && sum > toCents(total)
}

export interface InstallmentSummary {
  paid: number
  total: number
  open: number
  /** The earliest due day among the open installments; null when none is dated. */
  nextDue: string | null
  /** Part of the total no installment covers yet. */
  unscheduled: number
}

/**
 * "Paid X of Y" and the next due day for the item as saved, or null when it has
 * no installments (such an expense is paid in full, as always).
 */
export function installmentSummary(item: Pick<BudgetItem, 'total_price' | 'installments' | 'paid_amount' | 'open_amount'>): InstallmentSummary | null {
  const list = item.installments || []
  if (list.length === 0) return null
  return summarize(item.total_price || 0, list.map(i => ({ amount: i.amount, due_date: i.due_date, paid_at: i.paid_at })))
}

/** The same figures for the rows being edited, so the dialog can show them live. */
export function draftSummary(drafts: InstallmentDraft[], total: number): InstallmentSummary | null {
  const list = draftsToInput(drafts)
  if (list.length === 0) return null
  return summarize(total, list.map(i => ({ amount: i.amount, due_date: i.due_date ?? null, paid_at: i.paid_at ?? null })))
}

function summarize(total: number, list: { amount: number; due_date?: string | null; paid_at?: string | null }[]): InstallmentSummary {
  const totalCents = toCents(total)
  const paid = list.reduce((a, i) => a + (i.paid_at ? toCents(i.amount) : 0), 0)
  const scheduled = list.reduce((a, i) => a + toCents(i.amount), 0)
  const nextDue = list
    .filter(i => !i.paid_at && i.due_date)
    .map(i => i.due_date as string)
    .sort()[0] ?? null
  return {
    paid: paid / 100,
    total: totalCents / 100,
    open: Math.max(0, totalCents - paid) / 100,
    nextDue,
    unscheduled: Math.max(0, totalCents - scheduled) / 100,
  }
}

export interface DuePayment {
  item: BudgetItem
  installment: BudgetItemInstallment
  /** Due before `today` and still open. */
  overdue: boolean
}

/**
 * The trip's open installments, earliest due day first; undated ones last, in
 * the order the expenses and their installments are listed. `today` is the
 * viewer's local day (YYYY-MM-DD), so "overdue" means overdue where they are.
 */
export function duePayments(items: BudgetItem[], today: string): DuePayment[] {
  const rows: DuePayment[] = []
  for (const item of items) {
    for (const installment of item.installments || []) {
      if (installment.paid_at) continue
      rows.push({ item, installment, overdue: !!installment.due_date && installment.due_date < today })
    }
  }
  // Array.prototype.sort is stable, so equal days keep the list order.
  return rows.sort((a, b) => {
    const da = a.installment.due_date
    const db = b.installment.due_date
    if (da === db) return 0
    if (!da) return 1
    if (!db) return -1
    return da < db ? -1 : 1
  })
}

/** The item with one installment marked paid (a day) or open (null), with the figures redone. */
export function withInstallmentPaid(item: BudgetItem, installmentId: number, paidAt: string | null): BudgetItem {
  const installments = (item.installments || []).map(i => (i.id === installmentId ? { ...i, paid_at: paidAt } : i))
  const s = summarize(item.total_price || 0, installments)
  return { ...item, installments, paid_amount: s.paid, open_amount: s.open }
}
