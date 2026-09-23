import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Anzahlungen',
  'installments.hint':
    'Zahlung zeitlich aufteilen, z. B. jetzt eine Anzahlung und später die Restzahlung. Wer wem etwas schuldet, ändert sich dadurch nicht.',
  'installments.add': 'Anzahlung hinzufügen',
  'installments.label': 'Bezeichnung',
  'installments.labelPlaceholder': 'Anzahlung',
  'installments.amount': 'Betrag',
  'installments.dueDate': 'Fällig',
  'installments.paid': 'Bezahlt',
  'installments.markPaid': 'Als bezahlt markieren',
  'installments.markOpen': 'Als offen markieren',
  'installments.remove': 'Teilzahlung entfernen',
  'installments.paidOf': '{paid} von {total} bezahlt',
  'installments.nextDue': 'Nächste Fälligkeit {date}',
  'installments.unscheduled': '{amount} noch nicht eingeplant',
  'installments.unassigned': 'Nicht zugeordnet',
  'installments.remainder': 'Restbetrag',
  'installments.splitInvalid':
    'Die Anteile müssen jede Anzahlung ergeben und dürfen den Kostenanteil einer Person nicht überschreiten.',
  'installments.overTotal': 'Die Teilzahlungen ergeben {sum}, mehr als der Gesamtbetrag von {total}.',
  'installments.markPaidFailed': 'Die Zahlung konnte nicht aktualisiert werden.',
  'installments.openAmount': '{amount} offen',
  'installments.due.title': 'Fällige Zahlungen',
  'installments.due.empty': 'Keine offenen Zahlungen.',
  'installments.due.overdue': 'Überfällig',
  'installments.due.noDate': 'Kein Fälligkeitsdatum',
  'installments.due.more': '{count} weitere',
};

export default costsInstallments;
