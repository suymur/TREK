import { useCallback, useMemo, useState } from 'react'
import type { BudgetItem } from '@trek/shared'
import { localToday } from '../Planner/today'
import {
  draftSummary,
  depositSplitState,
  draftsExceedTotal,
  draftsFromItem,
  draftsSumCents,
  draftsToInput,
  emptyDraft,
  type InstallmentDraft,
  type ExpenseShares,
} from '../../utils/budgetInstallments'

/**
 * The installment rows of the expense dialog (fork #6), for the desktop modal
 * and the phone sheet alike, so both shells only carry markup. The rows are
 * saved with the expense: `input` goes out as the `installments` field of the
 * create or update request.
 */
export function useInstallmentDrafts(editing: Pick<BudgetItem, 'installments'> | null | undefined, total: number, fullShares: ExpenseShares) {
  const [drafts, setDrafts] = useState<InstallmentDraft[]>(() => draftsFromItem(editing))

  const add = useCallback(() => setDrafts(prev => [...prev, emptyDraft()]), [])
  const remove = useCallback((key: string) => setDrafts(prev => prev.filter(d => d.key !== key)), [])
  const update = useCallback((key: string, patch: Partial<Omit<InstallmentDraft, 'key' | 'id'>>) =>
    setDrafts(prev => prev.map(d => (d.key === key ? { ...d, ...patch } : d))), [])
  const togglePaid = useCallback((key: string) =>
    setDrafts(prev => prev.map(d => (d.key === key ? { ...d, paid_at: d.paid_at ? null : localToday() } : d))), [])

  const split = useMemo(() => depositSplitState(drafts, fullShares), [drafts, fullShares])
  const setMember = useCallback((key: string, userId: number, amount: string) =>
    setDrafts(prev => prev.map(d => d.key === key
      ? { ...d, manualMembers: true, members: {
        ...(d.manualMembers ? d.members : Object.fromEntries(Object.entries(split.allocations[key] || {}).map(([id, value]) => [id, String(value)]))),
        [userId]: amount.replace(',', '.'),
      } }
      : d)), [split])

  const input = useMemo(() => draftsToInput(drafts, fullShares), [drafts, fullShares])
  const exceeds = draftsExceedTotal(drafts, total)
  const summary = useMemo(() => draftSummary(drafts, total), [drafts, total])
  const sum = draftsSumCents(drafts) / 100

  // Empty new or unchanged expenses do not need this field. An edited expense
  // whose rows were removed must send [] so the server deletes those rows.
  const payload = useMemo(
    () => (input.length === 0 && (!editing?.installments || editing.installments.length === 0) ? {} : { installments: input }),
    [editing, input],
  )

  return { drafts, add, remove, update, togglePaid, setMember, split, input, payload, exceeds, invalidSplit: !split.valid, summary, sum }
}

export type InstallmentDraftsState = ReturnType<typeof useInstallmentDrafts>
