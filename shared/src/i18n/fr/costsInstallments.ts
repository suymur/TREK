import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Échéances',
  'installments.hint':
    'Répartissez le paiement dans le temps, par ex. un acompte maintenant et le solde plus tard. Qui doit quoi à qui ne change pas.',
  'installments.add': 'Ajouter une échéance',
  'installments.label': 'Libellé',
  'installments.labelPlaceholder': 'Acompte',
  'installments.amount': 'Montant',
  'installments.dueDate': 'Échéance',
  'installments.paid': 'Payé',
  'installments.markPaid': 'Marquer comme payé',
  'installments.markOpen': 'Marquer comme ouvert',
  'installments.remove': 'Supprimer l’échéance',
  'installments.paidOf': '{paid} payé sur {total}',
  'installments.nextDue': 'Prochaine échéance {date}',
  'installments.unscheduled': '{amount} pas encore planifié',
  'installments.unassigned': 'Unassigned',
  'installments.remainder': 'Remaining amount',
  'installments.splitInvalid':
    'Deposit shares must add up to each deposit and stay within each person’s expense share.',
  'installments.overTotal': 'Les échéances totalisent {sum}, plus que le total de {total}.',
  'installments.markPaidFailed': 'Le paiement n’a pas pu être mis à jour.',
  'installments.openAmount': '{amount} ouvert',
  'installments.due.title': 'Paiements à venir',
  'installments.due.empty': 'Aucun paiement ouvert.',
  'installments.due.overdue': 'En retard',
  'installments.due.noDate': 'Sans date d’échéance',
  'installments.due.more': '{count} de plus',
};

export default costsInstallments;
