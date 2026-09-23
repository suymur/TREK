import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import type { CostCategoryKey, CostCategoryRecord } from '@trek/shared'
import { useTranslation } from '../../i18n'
import CostCategoryDialog from './CostCategoryDialog'
import { useCanManageCostCategory, useCostCategoryIndex } from './useCostCategories'

/**
 * The two custom-category entries at the end of the category picker (#4):
 * "New category", and "Edit category" while the picked category is a custom
 * one the user may change (its creator or an admin). A new category is picked
 * right away. Desktop pills and phone rows only differ in markup; the dialog
 * and the rules live here once.
 */
export default function CostCategoryPickerActions({ selected, onSelect, variant }: {
  selected: string
  onSelect: (key: CostCategoryKey) => void
  variant: 'desktop' | 'mobile'
}) {
  const { t } = useTranslation()
  const cats = useCostCategoryIndex()
  const canManage = useCanManageCostCategory()
  const [dialog, setDialog] = useState<{ editing: CostCategoryRecord | null } | null>(null)

  const picked = cats.meta(selected).custom
  const editable = picked && canManage(picked.created_by) ? picked : null
  const Entry = variant === 'desktop' ? DesktopEntry : MobileEntry

  return (
    <>
      <Entry icon={<Plus size={12} />} label={t('costs.customCat.new')} onClick={() => setDialog({ editing: null })} />
      {editable && (
        <Entry icon={<Pencil size={12} />} label={t('costs.customCat.edit')} onClick={() => setDialog({ editing: editable })} />
      )}
      {dialog && (
        <CostCategoryDialog editing={dialog.editing} onClose={() => setDialog(null)} onSaved={onSelect} />
      )}
    </>
  )
}

interface EntryProps { icon: React.ReactNode; label: string; onClick: () => void }

function DesktopEntry({ icon, label, onClick }: EntryProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-edge-secondary bg-transparent py-1.5 pl-2 pr-3 text-content-muted"
      style={{ fontSize: 'calc(12.5px * var(--fs-scale-body, 1))', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
    >
      <span className="grid h-5 w-5 place-items-center rounded-md bg-surface-secondary">{icon}</span>
      {label}
    </button>
  )
}

function MobileEntry({ icon, label, onClick }: EntryProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-[10px] border-b border-[color:var(--m-rowbr)] px-[13px] py-[11px] text-left text-m-muted last:border-b-0"
    >
      <span className="flex-none">{icon}</span>
      <span className="flex-1 text-[0.78125rem] font-medium">{label}</span>
    </button>
  )
}
