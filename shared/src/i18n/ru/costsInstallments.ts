import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Платежи частями',
  'installments.hint':
    'Разделите оплату по времени, например задаток сейчас и остаток позже. Кто кому должен, не меняется.',
  'installments.add': 'Добавить платёж',
  'installments.label': 'Название',
  'installments.labelPlaceholder': 'Задаток',
  'installments.amount': 'Сумма',
  'installments.dueDate': 'Срок',
  'installments.paid': 'Оплачено',
  'installments.markPaid': 'Отметить оплаченным',
  'installments.markOpen': 'Отметить неоплаченным',
  'installments.remove': 'Удалить платёж',
  'installments.paidOf': 'Оплачено {paid} из {total}',
  'installments.nextDue': 'Следующий срок {date}',
  'installments.unscheduled': '{amount} ещё не запланировано',
  'installments.overTotal': 'Сумма платежей {sum} больше общей суммы {total}.',
  'installments.markPaidFailed': 'Не удалось обновить платёж.',
  'installments.openAmount': 'Не оплачено {amount}',
  'installments.due.title': 'Предстоящие платежи',
  'installments.due.empty': 'Нет неоплаченных платежей.',
  'installments.due.overdue': 'Просрочено',
  'installments.due.noDate': 'Без срока',
  'installments.due.more': 'ещё {count}',
};

export default costsInstallments;
