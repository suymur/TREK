import {
  Hotel, Utensils, ShoppingCart, Bus, Plane, Ticket, Camera, ShoppingBag, FileText, HeartPulse, Coins, MoreHorizontal, Fuel, ParkingCircle,
  Tag, Briefcase, Landmark, UtensilsCrossed, Coffee, Wine, Shirt, Gift, Sparkles, Palette, Music, Dumbbell, Baby, Dog, Wrench, BookOpen, Home, Smartphone, Umbrella, Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  COST_CATEGORIES,
  customCostCategoryKey,
  resolveCostCategory,
  type CostCategory,
  type CostCategoryIcon,
  type CostCategoryKey,
  type CostCategoryRecord,
} from '@trek/shared'

/**
 * The Costs categories: the 14 fixed ones plus the custom categories every user
 * of the instance shares (#4). Category colour is the one place an accent is
 * allowed (it visualises the category); everything else stays black/white. A
 * fixed category's label comes from i18n (`costs.cat.*`); a custom category
 * carries the name its creator typed.
 */
export interface CostCategoryMeta {
  key: CostCategoryKey
  /** i18n key of a fixed category; empty for a custom one (it has `label`). */
  labelKey: string
  /** The typed name of a custom category. */
  label?: string
  Icon: LucideIcon
  color: string
  /** The stored row behind a custom category. */
  custom?: CostCategoryRecord
}

export const COST_CAT_META: Record<CostCategory, CostCategoryMeta> = {
  accommodation: { key: 'accommodation', labelKey: 'costs.cat.accommodation', Icon: Hotel, color: '#16a34a' },
  food:          { key: 'food',          labelKey: 'costs.cat.food',          Icon: Utensils, color: '#ea580c' },
  groceries:     { key: 'groceries',     labelKey: 'costs.cat.groceries',     Icon: ShoppingCart, color: '#65a30d' },
  transport:     { key: 'transport',     labelKey: 'costs.cat.transport',     Icon: Bus, color: '#2563eb' },
  flights:       { key: 'flights',       labelKey: 'costs.cat.flights',       Icon: Plane, color: '#0ea5e9' },
  activities:    { key: 'activities',    labelKey: 'costs.cat.activities',    Icon: Ticket, color: '#9333ea' },
  sightseeing:   { key: 'sightseeing',   labelKey: 'costs.cat.sightseeing',   Icon: Camera, color: '#db2777' },
  shopping:      { key: 'shopping',      labelKey: 'costs.cat.shopping',      Icon: ShoppingBag, color: '#e11d48' },
  fees:          { key: 'fees',          labelKey: 'costs.cat.fees',          Icon: FileText, color: '#475569' },
  health:        { key: 'health',        labelKey: 'costs.cat.health',        Icon: HeartPulse, color: '#dc2626' },
  tips:          { key: 'tips',          labelKey: 'costs.cat.tips',          Icon: Coins, color: '#d97706' },
  fuel:          { key: 'fuel',          labelKey: 'costs.cat.fuel',          Icon: Fuel, color: '#f59e0b' },
  parking:       { key: 'parking',       labelKey: 'costs.cat.parking',       Icon: ParkingCircle, color: '#3b82f6' },
  other:         { key: 'other',         labelKey: 'costs.cat.other',         Icon: MoreHorizontal, color: '#6b7280' },
}

export const COST_CATEGORY_LIST: CostCategoryMeta[] = COST_CATEGORIES.map(k => COST_CAT_META[k])

/** The lucide component behind each icon name a custom category may pick. */
export const COST_CATEGORY_ICON_COMPONENTS: Record<CostCategoryIcon, LucideIcon> = {
  tag: Tag,
  briefcase: Briefcase,
  landmark: Landmark,
  'utensils-crossed': UtensilsCrossed,
  coffee: Coffee,
  wine: Wine,
  shirt: Shirt,
  gift: Gift,
  sparkles: Sparkles,
  palette: Palette,
  music: Music,
  dumbbell: Dumbbell,
  baby: Baby,
  dog: Dog,
  wrench: Wrench,
  'book-open': BookOpen,
  home: Home,
  smartphone: Smartphone,
  umbrella: Umbrella,
  star: Star,
}

/** The label of a category, fixed or custom. */
export function categoryLabel(meta: CostCategoryMeta, t: (key: string) => string): string {
  return meta.label ?? t(meta.labelKey)
}

/**
 * The one lookup every place that shows a category goes through (list, filter,
 * summary, pie chart, CSV, overview): the fixed categories, then the custom
 * ones in their sort order. Build it with buildCostCategoryIndex, or in a
 * component with useCostCategoryIndex (useCostCategories.ts).
 */
export interface CostCategoryIndex {
  /** Fixed categories first, then custom ones: the picker and breakdown order. */
  list: CostCategoryMeta[]
  /** Only the custom categories. */
  custom: CostCategoryMeta[]
  /** Any stored category (legacy free text and `custom:<id>` included) to its meta; unknown is `other`. */
  meta: (category: string | null | undefined) => CostCategoryMeta
  /** Shorthand for categoryLabel(meta(category), t). */
  label: (category: string | null | undefined, t: (key: string) => string) => string
}

export function buildCostCategoryIndex(customRows: readonly CostCategoryRecord[]): CostCategoryIndex {
  const custom: CostCategoryMeta[] = customRows.map(row => ({
    key: customCostCategoryKey(row.id),
    labelKey: '',
    label: row.name,
    Icon: COST_CATEGORY_ICON_COMPONENTS[row.icon] ?? Tag,
    color: row.color,
    custom: row,
  }))
  const byKey = new Map<string, CostCategoryMeta>([
    ...COST_CATEGORY_LIST.map(m => [m.key, m] as const),
    ...custom.map(m => [m.key, m] as const),
  ])
  const ids = new Set(customRows.map(r => r.id))
  const meta = (category: string | null | undefined) =>
    byKey.get(resolveCostCategory(category, ids)) ?? COST_CAT_META.other
  return {
    list: [...COST_CATEGORY_LIST, ...custom],
    custom,
    meta,
    label: (category, t) => categoryLabel(meta(category), t),
  }
}

/** The index without custom categories, for code that has no store at hand. */
export const FIXED_COST_CATEGORY_INDEX: CostCategoryIndex = buildCostCategoryIndex([])

/**
 * Map any stored category (incl. legacy/localized free-text values) to a fixed
 * meta; a custom key is `other` here. Prefer an index from useCostCategoryIndex,
 * which knows the custom categories.
 */
export function catMeta(cat: string | null | undefined): CostCategoryMeta {
  return FIXED_COST_CATEGORY_INDEX.meta(cat)
}
