import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Rate',
  'installments.hint':
    'Dividi il pagamento nel tempo, ad es. un acconto ora e il saldo più tardi. Chi deve a chi non cambia.',
  'installments.add': 'Aggiungi rata',
  'installments.label': 'Descrizione',
  'installments.labelPlaceholder': 'Acconto',
  'installments.amount': 'Importo',
  'installments.dueDate': 'Scadenza',
  'installments.paid': 'Pagato',
  'installments.markPaid': 'Segna come pagato',
  'installments.markOpen': 'Segna come aperto',
  'installments.remove': 'Rimuovi rata',
  'installments.paidOf': 'Pagato {paid} di {total}',
  'installments.nextDue': 'Prossima scadenza {date}',
  'installments.unscheduled': '{amount} non ancora pianificato',
  'installments.unassigned': 'Unassigned',
  'installments.remainder': 'Remaining amount',
  'installments.splitInvalid':
    'Deposit shares must add up to each deposit and stay within each person’s expense share.',
  'installments.overTotal': 'Le rate ammontano a {sum}, più del totale di {total}.',
  'installments.markPaidFailed': 'Impossibile aggiornare il pagamento.',
  'installments.openAmount': '{amount} da pagare',
  'installments.due.title': 'Pagamenti in scadenza',
  'installments.due.empty': 'Nessun pagamento aperto.',
  'installments.due.overdue': 'Scaduto',
  'installments.due.noDate': 'Nessuna scadenza',
  'installments.due.more': 'altri {count}',
};

export default costsInstallments;
