import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Delbetalningar',
  'installments.hint':
    'Dela upp betalningen över tid, t.ex. en handpenning nu och resten senare. Vem som är skyldig vem ändras inte.',
  'installments.add': 'Lägg till delbetalning',
  'installments.label': 'Benämning',
  'installments.labelPlaceholder': 'Handpenning',
  'installments.amount': 'Belopp',
  'installments.dueDate': 'Förfaller',
  'installments.paid': 'Betald',
  'installments.markPaid': 'Markera som betald',
  'installments.markOpen': 'Markera som öppen',
  'installments.remove': 'Ta bort delbetalning',
  'installments.paidOf': '{paid} av {total} betalt',
  'installments.nextDue': 'Nästa förfallodag {date}',
  'installments.unscheduled': '{amount} ännu inte planerat',
  'installments.overTotal': 'Delbetalningarna blir {sum}, mer än totalen {total}.',
  'installments.markPaidFailed': 'Betalningen kunde inte uppdateras.',
  'installments.openAmount': '{amount} öppet',
  'installments.due.title': 'Kommande betalningar',
  'installments.due.empty': 'Inga öppna betalningar.',
  'installments.due.overdue': 'Förfallen',
  'installments.due.noDate': 'Inget förfallodatum',
  'installments.due.more': '{count} till',
};

export default costsInstallments;
