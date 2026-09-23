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
}

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
  }))
}

export function emptyDraft(): InstallmentDraft {
  return { key: newKey(), label: '', amount: '', due_date: null, paid_at: null }
}

/** The input text as a number; a comma decimal counts like a point. */
export function draftAmount(d: Pick<InstallmentDraft, 'amount'>): number {
  const n = Number.parseFloat(d.amount.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Rows without a positive amount say nothing and are not sent. */
export function draftsToInput(drafts: InstallmentDraft[]): BudgetInstallmentInput[] {
  return drafts
    .filter(d => toCents(draftAmount(d)) > 0)
    .map(d => ({
      ...(d.id !== undefined ? { id: d.id } : {}),
      label: d.label.trim(),
      amount: Math.round(draftAmount(d) * 100) / 100,
      due_date: d.due_date || null,
      paid_at: d.paid_at || null,
    }))
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
