import {
  COST_CATEGORY_COLORS,
  COST_CATEGORY_ICONS,
  costCategoryCreateRequestSchema,
  costCategoryRecordSchema,
  costCategoryUpdateRequestSchema,
  customCostCategoryKey,
  parseCustomCostCategoryId,
} from './cost-categories.schema';
import { costCategoryKeySchema, resolveCostCategory } from './costs-overview.schema';

import { describe, it, expect } from 'vitest';

describe('custom category keys', () => {
  it('round-trips an id through its key', () => {
    expect(customCostCategoryKey(7)).toBe('custom:7');
    expect(parseCustomCostCategoryId('custom:7')).toBe(7);
    expect(parseCustomCostCategoryId(' custom:12 ')).toBe(12);
  });

  it('refuses anything that is not custom:<positive id>', () => {
    for (const bad of [
      null,
      undefined,
      '',
      'custom:',
      'custom:0',
      'custom:-1',
      'custom:1.5',
      'custom:abc',
      'Custom:1',
      'food',
      'custom:01',
    ]) {
      expect(parseCustomCostCategoryId(bad)).toBeNull();
    }
  });
});

describe('resolveCostCategory with custom categories', () => {
  it('keeps a custom key whose category exists', () => {
    expect(resolveCostCategory('custom:3', new Set([3]))).toBe('custom:3');
  });

  it('sends a custom key without a category to other', () => {
    expect(resolveCostCategory('custom:4', new Set([3]))).toBe('other');
    expect(resolveCostCategory('custom:4', new Set())).toBe('other');
  });

  it('keeps every well-formed custom key when the caller passes no ids', () => {
    expect(resolveCostCategory('custom:4')).toBe('custom:4');
    expect(resolveCostCategory('custom:x')).toBe('other');
  });

  it('leaves the fixed keys and the legacy mapping alone', () => {
    expect(resolveCostCategory('food', new Set([1]))).toBe('food');
    expect(resolveCostCategory('Hotel', new Set([1]))).toBe('accommodation');
  });
});

describe('costCategoryKeySchema', () => {
  it('accepts fixed and custom keys', () => {
    expect(costCategoryKeySchema.parse('fuel')).toBe('fuel');
    expect(costCategoryKeySchema.parse('custom:9')).toBe('custom:9');
  });

  it('refuses free text', () => {
    expect(costCategoryKeySchema.safeParse('Hotel').success).toBe(false);
    expect(costCategoryKeySchema.safeParse('custom:0').success).toBe(false);
  });
});

describe('cost category request schemas', () => {
  it('trims the name and accepts a listed icon and a hex colour', () => {
    const parsed = costCategoryCreateRequestSchema.parse({
      name: '  Deko ',
      icon: COST_CATEGORY_ICONS[0],
      color: COST_CATEGORY_COLORS[0],
    });
    expect(parsed.name).toBe('Deko');
  });

  it('refuses an empty or long name, an unknown icon, a bad colour and extra keys', () => {
    expect(costCategoryCreateRequestSchema.safeParse({ name: '  ', icon: 'tag', color: '#000000' }).success).toBe(
      false,
    );
    expect(
      costCategoryCreateRequestSchema.safeParse({ name: 'x'.repeat(41), icon: 'tag', color: '#000000' }).success,
    ).toBe(false);
    expect(costCategoryCreateRequestSchema.safeParse({ name: 'A', icon: 'rocket', color: '#000000' }).success).toBe(
      false,
    );
    expect(costCategoryCreateRequestSchema.safeParse({ name: 'A', icon: 'tag', color: 'red' }).success).toBe(false);
    expect(costCategoryCreateRequestSchema.safeParse({ name: 'A', icon: 'tag', color: '#000000', id: 3 }).success).toBe(
      false,
    );
  });

  it('needs at least one field on update', () => {
    expect(costCategoryUpdateRequestSchema.safeParse({}).success).toBe(false);
    expect(costCategoryUpdateRequestSchema.safeParse({ color: '#123abc' }).success).toBe(true);
  });

  it('parses a stored row with a deleted creator', () => {
    const row = {
      id: 1,
      name: 'Deko',
      icon: 'gift',
      color: '#db2777',
      created_by: null,
      created_at: '2026-09-23 10:00:00',
      sort_order: 0,
    };
    expect(costCategoryRecordSchema.parse(row)).toEqual(row);
  });
});
