import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Termijnen',
  'installments.hint':
    'Verdeel de betaling over de tijd, bijv. nu een aanbetaling en later het restant. Wie wie iets verschuldigd is, verandert niet.',
  'installments.add': 'Termijn toevoegen',
  'installments.label': 'Omschrijving',
  'installments.labelPlaceholder': 'Aanbetaling',
  'installments.amount': 'Bedrag',
  'installments.dueDate': 'Vervalt',
  'installments.paid': 'Betaald',
  'installments.markPaid': 'Markeren als betaald',
  'installments.markOpen': 'Markeren als open',
  'installments.remove': 'Termijn verwijderen',
  'installments.paidOf': '{paid} van {total} betaald',
  'installments.nextDue': 'Volgende vervaldatum {date}',
  'installments.unscheduled': '{amount} nog niet ingepland',
  'installments.overTotal': 'De termijnen komen samen op {sum}, meer dan het totaal van {total}.',
  'installments.markPaidFailed': 'De betaling kon niet worden bijgewerkt.',
  'installments.openAmount': '{amount} open',
  'installments.due.title': 'Openstaande betalingen',
  'installments.due.empty': 'Geen openstaande betalingen.',
  'installments.due.overdue': 'Achterstallig',
  'installments.due.noDate': 'Geen vervaldatum',
  'installments.due.more': 'nog {count}',
};

export default costsInstallments;
