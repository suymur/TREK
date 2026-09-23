import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import {
  COST_CATEGORY_COLORS,
  COST_CATEGORY_ICONS,
  COST_CATEGORY_NAME_MAX,
  customCostCategoryKey,
  type CostCategoryIcon,
  type CostCategoryKey,
  type CostCategoryRecord,
} from '@trek/shared'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import { useToast } from '../shared/Toast'
import { useTranslation } from '../../i18n'
import { useCostCategoryStore } from '../../store/costCategoryStore'
import { CostCategoryOfflineError } from '../../repo/costCategoryRepo'
import { COST_CATEGORY_ICON_COMPONENTS } from './costsCategories'
import { useCanManageCostCategory } from './useCostCategories'

type T = (key: string, params?: Record<string, string | number>) => string

/** The message for a failed category write: offline, a taken name, or anything else. */
export function costCategoryErrorKey(err: unknown): string {
  if (err instanceof CostCategoryOfflineError) return 'costs.customCat.offline'
  const status = (err as { response?: { status?: number } } | null)?.response?.status
  if (status === 409) return 'costs.customCat.duplicate'
  if (status === 403) return 'costs.customCat.notAllowed'
  return 'common.unknownError'
}

/**
 * Create or edit a custom cost category (#4): a name, an icon from a short
 * lucide list and a colour. Desktop and phone share this one dialog. On edit,
 * the creator or an admin can delete the category; its expenses move to Other.
 */
export default function CostCategoryDialog({ editing, onClose, onSaved }: {
  /** The category to edit; null creates a new one. */
  editing: CostCategoryRecord | null
  onClose: () => void
  /** Called with the key of the saved category (not after a delete). */
  onSaved?: (key: CostCategoryKey) => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { create, update, remove } = useCostCategoryStore()
  const canManage = useCanManageCostCategory()
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState<CostCategoryIcon>(editing?.icon ?? 'tag')
  const [color, setColor] = useState<string>(editing?.color ?? COST_CATEGORY_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && !busy

  const save = async () => {
    if (!canSave) return
    setBusy(true)
    try {
      const row = editing
        ? await update(editing.id, { name: trimmed, icon, color })
        : await create({ name: trimmed, icon, color })
      onSaved?.(customCostCategoryKey(row.id))
      onClose()
    } catch (err) {
      toast.error(t(costCategoryErrorKey(err)))
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    if (!editing) return
    try {
      const { moved } = await remove(editing.id)
      toast.success(t('costs.customCat.deleted', { count: moved }))
      onClose()
    } catch (err) {
      toast.error(t(costCategoryErrorKey(err)))
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title={t(editing ? 'costs.customCat.edit' : 'costs.customCat.new')}
      footer={
        <DialogFooter
          t={t}
          canSave={canSave}
          onSave={save}
          onCancel={onClose}
          onDelete={editing && canManage(editing.created_by) ? () => setConfirmDelete(true) : undefined}
        />
      }
    >
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); save() }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-content-muted">{t('costs.customCat.name')}</span>
          <input
            autoFocus
            value={name}
            maxLength={COST_CATEGORY_NAME_MAX}
            onChange={e => setName(e.target.value)}
            placeholder={t('costs.customCat.namePlaceholder')}
            className="w-full rounded-lg border border-edge bg-surface-secondary px-3 py-2 text-sm text-content outline-none focus:border-edge-secondary"
          />
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-semibold text-content-muted">{t('costs.customCat.icon')}</legend>
          <div className="grid grid-cols-10 gap-1.5">
            {COST_CATEGORY_ICONS.map(name => {
              const Icon = COST_CATEGORY_ICON_COMPONENTS[name]
              const on = icon === name
              return (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  aria-pressed={on}
                  onClick={() => setIcon(name)}
                  className={`grid h-8 w-8 place-items-center rounded-lg border ${on ? 'border-content bg-surface-card' : 'border-edge bg-surface-secondary text-content-muted'}`}
                  style={on ? { color } : undefined}
                >
                  <Icon size={15} />
                </button>
              )
            })}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-semibold text-content-muted">{t('costs.customCat.color')}</legend>
          <div className="flex flex-wrap gap-2">
            {COST_CATEGORY_COLORS.map(c => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className="grid h-7 w-7 place-items-center rounded-full"
                style={{ background: c, color: '#fff' }} // theme-lint-disable — the swatch is the category colour itself
              >
                {color === c && <Check size={14} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-content-faint">{t('costs.customCat.shared')}</p>
      </form>
      {editing && (
        <ConfirmDialog
          isOpen={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={doDelete}
          title={t('costs.customCat.delete')}
          message={t('costs.customCat.deleteConfirm', { name: editing.name })}
        />
      )}
    </Modal>
  )
}

function DialogFooter({ t, canSave, onSave, onCancel, onDelete }: {
  t: T
  canSave: boolean
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-danger"
        >
          <Trash2 size={14} />
          {t('common.delete')}
        </button>
      )}
      <span className="flex-1" />
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-edge-secondary px-4 py-2 text-sm font-medium text-content-secondary"
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        disabled={!canSave}
        onClick={onSave}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-text disabled:cursor-not-allowed disabled:bg-surface-tertiary disabled:text-content-secondary"
      >
        {t('common.save')}
      </button>
    </div>
  )
}
