import type { BudgetItemInstallment } from '@trek/shared';

/**
 * The pure half of expense installments (fork #6): partial payments of one
 * expense over time, such as a deposit now and the remainder later. No DB here;
 * BudgetService reads and writes the rows and asks these functions for the
 * figures and the rule.
 *
 * Money is added in whole cents, the same rule the rest of the budget follows,
 * so 0.1 + 0.2 never lands a cent over the total.
 */

const toCents = (amount: number): number => Math.round(amount * 100);

/**
 * Refused when the installments of an expense would add up to more than its
 * total. Thrown inside the write transaction, so nothing of the write sticks.
 * The REST route answers 400 with this message, the MCP tool returns it as the
 * error text and the plugin RPC as BadParams.
 */
export class InstallmentsExceedTotalError extends Error {
  constructor(readonly installmentsTotal: number, readonly total: number) {
    super(`The installments add up to ${installmentsTotal.toFixed(2)}, more than the expense total of ${total.toFixed(2)}. Lower an installment or raise the total.`);
    this.name = 'InstallmentsExceedTotalError';
  }
}

/** Throws InstallmentsExceedTotalError when the amounts add up to more than `total`. */
export function assertInstallmentsFit(total: number, amounts: number[]): void {
  if (amounts.length === 0) return;
  const sum = amounts.reduce((a, v) => a + toCents(v), 0);
  const cap = toCents(total);
  if (sum > cap) throw new InstallmentsExceedTotalError(sum / 100, cap / 100);
}

/**
 * What has been paid and what is still open on one expense, in its currency.
 *
 * Without installments an expense is paid in full, as every expense was before
 * installments existed. With installments, only the paid ones count as paid and
 * everything else is open, including any part of the total no installment
 * covers yet: an expense of 3000 with a paid deposit of 1000 and nothing else
 * has 2000 open.
 */
export function installmentAmounts(
  total: number,
  installments: Pick<BudgetItemInstallment, 'amount' | 'paid_at'>[],
): { paid_amount: number; open_amount: number } {
  const totalCents = toCents(total);
  if (installments.length === 0) return { paid_amount: totalCents / 100, open_amount: 0 };
  const paid = installments.reduce((a, i) => a + (i.paid_at ? toCents(i.amount) : 0), 0);
  return { paid_amount: paid / 100, open_amount: Math.max(0, totalCents - paid) / 100 };
}
