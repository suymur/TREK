import { describe, it, expect } from 'vitest';
import { storedExpenseCategory } from '../../../src/nest/cost-categories/cost-categories.helpers';
import { CostCategoriesMcp } from '../../../src/nest/cost-categories/cost-categories.mcp';
import type { CostCategoriesService } from '../../../src/nest/cost-categories/cost-categories.service';
import type { AddonsService } from '../../../src/nest/addons/addons.service';

describe('storedExpenseCategory (#4)', () => {
  const exists = (id: number) => id === 3;

  it('keeps a custom key whose category exists', () => {
    expect(storedExpenseCategory('custom:3', exists)).toBe('custom:3');
  });

  it('stores a custom key without a category as other', () => {
    expect(storedExpenseCategory('custom:4', exists)).toBe('other');
  });

  it('passes fixed keys, legacy text and absent values through', () => {
    expect(storedExpenseCategory('food', exists)).toBe('food');
    expect(storedExpenseCategory('Taxi', exists)).toBe('Taxi');
    expect(storedExpenseCategory('custom:x', exists)).toBe('custom:x');
    expect(storedExpenseCategory(undefined, exists)).toBeUndefined();
    expect(storedExpenseCategory(null, exists)).toBeNull();
  });
});

describe('list_cost_categories MCP tool (#4)', () => {
  it('lists the fixed keys and each custom category with the key to pass', () => {
    const service = {
      list: () => [{ id: 7, name: 'Deko', icon: 'gift', color: '#db2777', created_by: 1, created_at: 'x', sort_order: 0 }],
    } as unknown as CostCategoriesService;
    const tool = new CostCategoriesMcp(service, {} as AddonsService);
    const result = tool.listCostCategories({}, { userId: 1 } as never);
    const body = JSON.parse((result.content[0] as { text: string }).text);
    expect(body.fixed).toContain('food');
    expect(body.custom).toEqual([{ key: 'custom:7', name: 'Deko', icon: 'gift', color: '#db2777' }]);
  });
});
