import {
  budgetCreateItemRequestSchema,
  budgetUpdateItemRequestSchema,
  budgetItemSchema,
  budgetInstallmentInputSchema,
  budgetSetInstallmentPaidRequestSchema,
  INSTALLMENT_LABEL_MAX,
  budgetUpdateMembersRequestSchema,
  budgetToggleMemberPaidRequestSchema,
  budgetReorderItemsRequestSchema,
  COST_CATEGORIES,
  typeToCostCategory,
} from './budget.schema';

import { describe, it, expect } from 'vitest';

describe('budgetCreateItemRequestSchema', () => {
  it('requires a name; money/meta fields optional + nullable', () => {
    expect(budgetCreateItemRequestSchema.safeParse({ name: 'Hotel' }).success).toBe(true);
    expect(
      budgetCreateItemRequestSchema.safeParse({
        name: 'Hotel',
        total_price: 200,
        persons: null,
      }).success,
    ).toBe(true);
    expect(budgetCreateItemRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('budgetUpdateMembersRequestSchema', () => {
  it('requires a numeric user_ids array', () => {
    expect(budgetUpdateMembersRequestSchema.safeParse({ user_ids: [1, 2] }).success).toBe(true);
    expect(budgetUpdateMembersRequestSchema.safeParse({ user_ids: 'no' }).success).toBe(false);
  });
});

describe('budgetToggleMemberPaidRequestSchema', () => {
  it('requires a boolean paid', () => {
    expect(budgetToggleMemberPaidRequestSchema.safeParse({ paid: true }).success).toBe(true);
    expect(budgetToggleMemberPaidRequestSchema.safeParse({ paid: 'yes' }).success).toBe(false);
  });
});

describe('budgetReorderItemsRequestSchema', () => {
  it('requires numeric ids', () => {
    expect(budgetReorderItemsRequestSchema.safeParse({ orderedIds: [3, 1, 2] }).success).toBe(true);
    expect(budgetReorderItemsRequestSchema.safeParse({ orderedIds: ['a'] }).success).toBe(false);
  });
});

describe('COST_CATEGORIES', () => {
  it('includes fuel and parking alongside the existing fixed categories', () => {
    expect(COST_CATEGORIES).toContain('fuel');
    expect(COST_CATEGORIES).toContain('parking');
  });
});

describe('typeToCostCategory', () => {
  it('files a parking booking under parking, not transport', () => {
    expect(typeToCostCategory('parking')).toBe('parking');
  });

  it('leaves the other vehicle types on transport', () => {
    expect(typeToCostCategory('car-rental')).toBe('transport');
    expect(typeToCostCategory('taxi')).toBe('transport');
  });
});

describe('cost_status', () => {
  it('accepts estimate and final on create and update, and stays optional', () => {
    expect(budgetCreateItemRequestSchema.safeParse({ name: 'Hotel', cost_status: 'estimate' }).success).toBe(true);
    expect(budgetCreateItemRequestSchema.safeParse({ name: 'Hotel', cost_status: 'final' }).success).toBe(true);
    expect(budgetUpdateItemRequestSchema.safeParse({ cost_status: 'final' }).success).toBe(true);
    expect(budgetUpdateItemRequestSchema.safeParse({}).success).toBe(true);
  });

  it('rejects any other value', () => {
    expect(budgetCreateItemRequestSchema.safeParse({ name: 'Hotel', cost_status: 'planned' }).success).toBe(false);
    expect(budgetUpdateItemRequestSchema.safeParse({ cost_status: null }).success).toBe(false);
    expect(
      budgetItemSchema.safeParse({
        id: 1,
        trip_id: 1,
        category: 'food',
        name: 'x',
        total_price: 1,
        cost_status: 'maybe',
      }).success,
    ).toBe(false);
  });
});

describe('installments', () => {
  it('accepts a deposit and a remainder on create and update', () => {
    const installments = [
      { label: 'Deposit', amount: 1000, due_date: '2026-10-01', paid_at: '2026-09-20' },
      { label: 'Remainder', amount: 2000, due_date: '2026-11-15', paid_at: null },
    ];
    expect(budgetCreateItemRequestSchema.safeParse({ name: 'Hotel', total_price: 3000, installments }).success).toBe(
      true,
    );
    expect(budgetUpdateItemRequestSchema.safeParse({ installments: [{ id: 4, label: '', amount: 5 }] }).success).toBe(
      true,
    );
    expect(budgetUpdateItemRequestSchema.safeParse({ installments: [] }).success).toBe(true);
    expect(
      budgetUpdateItemRequestSchema.safeParse({
        installments: [{ label: 'Deposit', amount: 5, members: [{ user_id: 1, amount: 5 }] }],
      }).success,
    ).toBe(true);
  });

  it('refuses a zero or negative amount, a bad day and an overlong label', () => {
    expect(budgetInstallmentInputSchema.safeParse({ label: 'x', amount: 0 }).success).toBe(false);
    expect(budgetInstallmentInputSchema.safeParse({ label: 'x', amount: 0.001 }).success).toBe(false);
    expect(budgetInstallmentInputSchema.safeParse({ label: 'x', amount: 0.01 }).success).toBe(true);
    expect(budgetInstallmentInputSchema.safeParse({ label: 'x', amount: -5 }).success).toBe(false);
    expect(
      budgetInstallmentInputSchema.safeParse({ label: 'x', amount: 5, members: [{ user_id: 1, amount: -1 }] }).success,
    ).toBe(false);
    expect(budgetInstallmentInputSchema.safeParse({ label: 'x', amount: 5, due_date: '01.10.2026' }).success).toBe(
      false,
    );
    expect(
      budgetInstallmentInputSchema.safeParse({ label: 'x'.repeat(INSTALLMENT_LABEL_MAX + 1), amount: 5 }).success,
    ).toBe(false);
  });

  it('marks paid with a day and open again with null', () => {
    expect(budgetSetInstallmentPaidRequestSchema.safeParse({ paid_at: '2026-09-23' }).success).toBe(true);
    expect(budgetSetInstallmentPaidRequestSchema.safeParse({ paid_at: null }).success).toBe(true);
    expect(budgetSetInstallmentPaidRequestSchema.safeParse({}).success).toBe(false);
    expect(budgetSetInstallmentPaidRequestSchema.safeParse({ paid_at: true }).success).toBe(false);
  });

  it('carries installments and the paid / open amounts on the item', () => {
    const parsed = budgetItemSchema.safeParse({
      id: 1,
      trip_id: 1,
      category: 'accommodation',
      name: 'Hotel',
      total_price: 3000,
      installments: [
        {
          id: 1,
          budget_item_id: 1,
          label: 'Deposit',
          amount: 1000,
          due_date: null,
          paid_at: '2026-09-20',
          sort_order: 0,
          members: [{ user_id: 1, amount: 1000 }],
        },
      ],
      paid_amount: 1000,
      open_amount: 2000,
    });
    expect(parsed.success).toBe(true);
  });
});
