import { describe, it, expect } from 'vitest';
import {
  buildCostsCsv,
  categoryBreakdown,
  categoryFilterKeys,
  filterBudgetItems,
  type CostsCtx,
} from '../../../../src/mobile/screens/trip/tabs/costsModel';
import { buildCostCategoryIndex } from '../../../../src/components/Budget/costsCategories';
import { buildBudgetItem } from '../../../helpers/factories';

// FE-MOB-CMOD-CUSTOM-001 to 004 — custom cost categories (#4) in the phone model.

const cats = buildCostCategoryIndex([
  { id: 5, name: 'Deko', icon: 'gift', color: '#db2777', created_by: 1, created_at: 'x', sort_order: 0 },
]);
const ctx: CostsCtx = { me: 1, tripCurrency: 'EUR', convert: (amount) => amount, cats };
const items = [
  buildBudgetItem({ id: 1, category: 'custom:5', total_price: 30, expense_date: '2026-01-02' }),
  buildBudgetItem({ id: 2, category: 'food', total_price: 10, expense_date: '2026-01-01' }),
  buildBudgetItem({ id: 3, category: 'custom:6', total_price: 5, expense_date: '2026-01-03' }),
];

describe('costsModel with custom categories (#4)', () => {
  it('FE-MOB-CMOD-CUSTOM-001: filters by a custom key', () => {
    const list = filterBudgetItems(items, { search: '', segment: 'all', categoryKey: 'custom:5', dayKey: '' }, ctx);
    expect(list.map(e => e.id)).toEqual([1]);
  });

  it('FE-MOB-CMOD-CUSTOM-002: lists custom categories after the fixed ones and folds unknown ones into other', () => {
    expect(categoryFilterKeys(items, ctx)).toEqual(['food', 'other', 'custom:5']);
    expect(categoryFilterKeys(items)).toEqual(['food', 'other']);
  });

  it('FE-MOB-CMOD-CUSTOM-003: breaks the total down by custom category', () => {
    expect(categoryBreakdown(items, ctx).map(b => [b.key, b.amount])).toEqual([
      ['custom:5', 30],
      ['food', 10],
      ['other', 5],
    ]);
  });

  it('FE-MOB-CMOD-CUSTOM-004: writes the category name into the CSV, never custom:<id>', () => {
    const { content } = buildCostsCsv(items, { base: 'EUR', ctx, locale: 'en-US', t: (k) => k });
    expect(content).toContain(';Deko;');
    expect(content).not.toContain('custom:');
  });
});
