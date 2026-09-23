import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Raty',
  'installments.hint':
    'Rozłóż płatność w czasie, np. zaliczka teraz, a reszta później. To, kto komu jest winien, się nie zmienia.',
  'installments.add': 'Dodaj ratę',
  'installments.label': 'Opis',
  'installments.labelPlaceholder': 'Zaliczka',
  'installments.amount': 'Kwota',
  'installments.dueDate': 'Termin',
  'installments.paid': 'Zapłacono',
  'installments.markPaid': 'Oznacz jako zapłacone',
  'installments.markOpen': 'Oznacz jako otwarte',
  'installments.remove': 'Usuń ratę',
  'installments.paidOf': 'Zapłacono {paid} z {total}',
  'installments.nextDue': 'Następny termin {date}',
  'installments.unscheduled': '{amount} jeszcze nie zaplanowano',
  'installments.overTotal': 'Raty sumują się do {sum}, więcej niż suma {total}.',
  'installments.markPaidFailed': 'Nie udało się zaktualizować płatności.',
  'installments.openAmount': '{amount} do zapłaty',
  'installments.due.title': 'Płatności do uregulowania',
  'installments.due.empty': 'Brak otwartych płatności.',
  'installments.due.overdue': 'Po terminie',
  'installments.due.noDate': 'Bez terminu',
  'installments.due.more': 'jeszcze {count}',
};

export default costsInstallments;
