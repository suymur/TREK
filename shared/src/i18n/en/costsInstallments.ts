import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Installments',
  'installments.hint':
    'Split the payment over time, e.g. a deposit now and the remainder later. Who owes whom does not change.',
  'installments.add': 'Add installment',
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
