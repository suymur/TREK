import { useCallback, useMemo, useState } from 'react'
import type { BudgetItem } from '@trek/shared'
import { localToday } from '../Planner/today'
import {
  draftSummary,
  draftsExceedTotal,
  draftsFromItem,
  draftsSumCents,
  draftsToInput,
  emptyDraft,
  type InstallmentDraft,
} from '../../utils/budgetInstallments'

/**
 * The installment rows of the expense dialog (fork #6), for the desktop modal
 * and the phone sheet alike, so both shells only carry markup. The rows are
 * saved with the expense: `input` goes out as the `installments` field of the
 * create or update request.
 */
export function useInstallmentDrafts(editing: Pick<BudgetItem, 'installments'> | null | undefined, total: number) {
  const [drafts, setDrafts] = useState<InstallmentDraft[]>(() => draftsFromItem(editing))

  const add = useCallback(() => setDrafts(prev => [...prev, emptyDraft()]), [])
  const remove = useCallback((key: string) => setDrafts(prev => prev.filter(d => d.key !== key)), [])
  const update = useCallback((key: string, patch: Partial<Omit<InstallmentDraft, 'key' | 'id'>>) =>
    setDrafts(prev => prev.map(d => (d.key === key ? { ...d, ...patch } : d))), [])
  const togglePaid = useCallback((key: string) =>
    setDrafts(prev => prev.map(d => (d.key === key ? { ...d, paid_at: d.paid_at ? null : localToday() } : d))), [])

  const input = useMemo(() => draftsToInput(drafts), [drafts])
  const exceeds = draftsExceedTotal(drafts, total)
  const summary = useMemo(() => draftSummary(drafts, total), [drafts, total])
  const sum = draftsSumCents(drafts) / 100

  // What the save request carries. An item read from an offline cache written
  // before installments existed has no `installments` at all; sending [] for it
  // would delete rows the dialog never saw, so an untouched empty list is left out.
  const payload = useMemo(
    () => (editing && editing.installments === undefined && input.length === 0 ? {} : { installments: input }),
    [editing, input],
  )

  return { drafts, add, remove, update, togglePaid, input, payload, exceeds, summary, sum }
}

export type InstallmentDraftsState = ReturnType<typeof useInstallmentDrafts>
