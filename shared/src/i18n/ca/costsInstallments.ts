import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Terminis',
  'installments.hint':
    'Reparteix el pagament en el temps, p. ex. una bestreta ara i la resta més tard. Qui deu a qui no canvia.',
  'installments.add': 'Afegeix un termini',
  'installments.label': 'Concepte',
  'installments.labelPlaceholder': 'Bestreta',
  'installments.amount': 'Import',
  'installments.dueDate': 'Venciment',
  'installments.paid': 'Pagat',
  'installments.markPaid': 'Marca com a pagat',
  'installments.markOpen': 'Marca com a pendent',
  'installments.remove': 'Elimina el termini',
  'installments.paidOf': 'Pagat {paid} de {total}',
  'installments.nextDue': 'Proper venciment {date}',
  'installments.unscheduled': '{amount} encara sense planificar',
  'installments.overTotal': 'Els terminis sumen {sum}, més que el total de {total}.',
  'installments.markPaidFailed': 'No s’ha pogut actualitzar el pagament.',
  'installments.openAmount': '{amount} pendent',
  'installments.due.title': 'Pagaments pendents',
  'installments.due.empty': 'No hi ha pagaments pendents.',
  'installments.due.overdue': 'Vençut',
  'installments.due.noDate': 'Sense data de venciment',
  'installments.due.more': '{count} més',
};

export default costsInstallments;
