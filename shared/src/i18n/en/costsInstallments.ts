import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Deposits',
  'installments.hint':
    'Split the payment over time, e.g. a deposit now and the remainder later. Who owes whom does not change.',
  'installments.add': 'Add deposit',
  'installments.label': 'Label',
  'installments.labelPlaceholder': 'Deposit',
  'installments.amount': 'Amount',
  'installments.dueDate': 'Due',
  'installments.paid': 'Paid',
  'installments.markPaid': 'Mark paid',
  'installments.markOpen': 'Mark open',
  'installments.remove': 'Remove installment',
  'installments.paidOf': 'Paid {paid} of {total}',
  'installments.nextDue': 'Next due {date}',
  'installments.unscheduled': '{amount} not scheduled yet',
  'installments.unassigned': 'Unassigned',
  'installments.remainder': 'Remaining amount',
  'installments.splitInvalid':
    'Deposit shares must add up to each deposit and stay within each person’s expense share.',
  'installments.overTotal': 'The installments add up to {sum}, more than the total of {total}.',
  'installments.markPaidFailed': 'The payment could not be updated.',
  'installments.openAmount': '{amount} open',
  'installments.due.title': 'Due payments',
  'installments.due.empty': 'No open payments.',
  'installments.due.overdue': 'Overdue',
  'installments.due.noDate': 'No due date',
  'installments.due.more': '{count} more',
};

export default costsInstallments;
