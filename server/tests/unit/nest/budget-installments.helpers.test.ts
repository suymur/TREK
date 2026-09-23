/**
 * The pure half of expense installments (fork #6): the sum rule and the
 * paid / open figures.
 */
import { describe, it, expect } from 'vitest';
import { assertInstallmentAllocations, assertInstallmentsFit, installmentAmounts, InstallmentAllocationError, InstallmentsExceedTotalError } from '../../../src/nest/budget/budget-installments';

describe('assertInstallmentsFit', () => {
  it('lets no installments and a sum up to the total through', () => {
    expect(() => assertInstallmentsFit(-20, [])).not.toThrow();
    expect(() => assertInstallmentsFit(3000, [1000, 2000])).not.toThrow();
    expect(() => assertInstallmentsFit(0.3, [0.1, 0.2])).not.toThrow();
  });

  it('refuses a sum over the total, with both figures in the message', () => {
    try {
      assertInstallmentsFit(100, [60, 40.01]);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(InstallmentsExceedTotalError);
      expect((err as InstallmentsExceedTotalError).installmentsTotal).toBe(100.01);
      expect((err as Error).message).toContain('100.01');
      expect((err as Error).message).toContain('100.00');
    }
  });
});

describe('installmentAmounts', () => {
  it('counts an expense without installments as paid in full', () => {
    expect(installmentAmounts(42.5, [])).toEqual({ paid_amount: 42.5, open_amount: 0 });
  });

  it('pays only the paid installments and leaves the rest open, scheduled or not', () => {
    expect(installmentAmounts(3000, [{ amount: 1000, paid_at: '2026-09-01' }, { amount: 2000, paid_at: null }]))
      .toEqual({ paid_amount: 1000, open_amount: 2000 });
    expect(installmentAmounts(3000, [{ amount: 1000, paid_at: '2026-09-01' }]))
      .toEqual({ paid_amount: 1000, open_amount: 2000 });
  });

  it('never reports a negative open amount', () => {
    expect(installmentAmounts(-10, [{ amount: 5, paid_at: '2026-09-01' }])).toEqual({ paid_amount: 5, open_amount: 0 });
  });
});

describe('assertInstallmentAllocations', () => {
  const shares = new Map([[1, 41965], [2, 41965]]);

  it('accepts two independently split deposits and leaves exact remainder cents', () => {
    const deposits = [
      { amount: 200, members: [{ user_id: 1, amount: 100 }, { user_id: 2, amount: 100 }] },
      { amount: 100, members: [{ user_id: 1, amount: 0 }, { user_id: 2, amount: 100 }] },
    ];
    expect(() => assertInstallmentAllocations(shares, deposits)).not.toThrow();
    const used = [1, 2].map(id => deposits.reduce((cents, deposit) => cents + Math.round((deposit.members.find(m => m.user_id === id)?.amount ?? 0) * 100), 0));
    expect([shares.get(1)! - used[0], shares.get(2)! - used[1]]).toEqual([31965, 21965]);
  });

  it('rejects sums, outsiders and a member over their full share', () => {
    expect(() => assertInstallmentAllocations(shares, [{ amount: 200, members: [{ user_id: 1, amount: 199.99 }] }]))
      .toThrow(InstallmentAllocationError);
    expect(() => assertInstallmentAllocations(shares, [{ amount: 200, members: [{ user_id: 3, amount: 200 }] }]))
      .toThrow(InstallmentAllocationError);
    expect(() => assertInstallmentAllocations(shares, [
      { amount: 200, members: [{ user_id: 1, amount: 200 }] },
      { amount: 300, members: [{ user_id: 1, amount: 300 }] },
    ])).toThrow(InstallmentAllocationError);
  });

  it('keeps older unallocated installments readable', () => {
    expect(() => assertInstallmentAllocations(shares, [{ amount: 200, members: [] }])).not.toThrow();
  });
});
