import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Платежі частинами',
  'installments.hint':
    'Розподіліть оплату в часі, наприклад завдаток зараз і решту пізніше. Хто кому винен, не змінюється.',
  'installments.add': 'Додати платіж',
  'installments.label': 'Назва',
  'installments.labelPlaceholder': 'Завдаток',
  'installments.amount': 'Сума',
  'installments.dueDate': 'Термін',
  'installments.paid': 'Оплачено',
  'installments.markPaid': 'Позначити оплаченим',
  'installments.markOpen': 'Позначити неоплаченим',
  'installments.remove': 'Видалити платіж',
  'installments.paidOf': 'Оплачено {paid} з {total}',
  'installments.nextDue': 'Наступний термін {date}',
  'installments.unscheduled': '{amount} ще не заплановано',
  'installments.unassigned': 'Unassigned',
  'installments.remainder': 'Remaining amount',
  'installments.splitInvalid':
    'Deposit shares must add up to each deposit and stay within each person’s expense share.',
  'installments.overTotal': 'Сума платежів {sum} більша за загальну суму {total}.',
  'installments.markPaidFailed': 'Не вдалося оновити платіж.',
  'installments.openAmount': 'Не оплачено {amount}',
  'installments.due.title': 'Найближчі платежі',
  'installments.due.empty': 'Немає неоплачених платежів.',
  'installments.due.overdue': 'Прострочено',
  'installments.due.noDate': 'Без терміну',
  'installments.due.more': 'ще {count}',
};

export default costsInstallments;
