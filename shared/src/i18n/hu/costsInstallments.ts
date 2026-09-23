import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Részletek',
  'installments.hint':
    'Oszd el a fizetést időben, pl. most előleg, később a maradék. Az, hogy ki kinek tartozik, nem változik.',
  'installments.add': 'Részlet hozzáadása',
  'installments.label': 'Megnevezés',
  'installments.labelPlaceholder': 'Előleg',
  'installments.amount': 'Összeg',
  'installments.dueDate': 'Esedékes',
  'installments.paid': 'Fizetve',
  'installments.markPaid': 'Megjelölés fizetettként',
  'installments.markOpen': 'Megjelölés nyitottként',
  'installments.remove': 'Részlet törlése',
  'installments.paidOf': '{total} összegből {paid} fizetve',
  'installments.nextDue': 'Következő esedékesség: {date}',
  'installments.unscheduled': '{amount} még nincs beütemezve',
  'installments.overTotal': 'A részletek összege {sum}, több mint a {total} végösszeg.',
  'installments.markPaidFailed': 'A fizetést nem sikerült frissíteni.',
  'installments.openAmount': '{amount} nyitott',
  'installments.due.title': 'Esedékes fizetések',
  'installments.due.empty': 'Nincs nyitott fizetés.',
  'installments.due.overdue': 'Lejárt',
  'installments.due.noDate': 'Nincs határidő',
  'installments.due.more': 'még {count}',
};

export default costsInstallments;
