import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Splátky',
  'installments.hint': 'Rozložte platbu v čase, např. záloha teď a doplatek později. Kdo komu dluží, se nemění.',
  'installments.add': 'Přidat splátku',
  'installments.label': 'Popis',
  'installments.labelPlaceholder': 'Záloha',
  'installments.amount': 'Částka',
  'installments.dueDate': 'Splatnost',
  'installments.paid': 'Zaplaceno',
  'installments.markPaid': 'Označit jako zaplacené',
  'installments.markOpen': 'Označit jako otevřené',
  'installments.remove': 'Odebrat splátku',
  'installments.paidOf': 'Zaplaceno {paid} z {total}',
  'installments.nextDue': 'Další splatnost {date}',
  'installments.unscheduled': '{amount} zatím nenaplánováno',
  'installments.overTotal': 'Splátky dávají dohromady {sum}, více než celková částka {total}.',
  'installments.markPaidFailed': 'Platbu se nepodařilo aktualizovat.',
  'installments.openAmount': '{amount} otevřeno',
  'installments.due.title': 'Splatné platby',
  'installments.due.empty': 'Žádné otevřené platby.',
  'installments.due.overdue': 'Po splatnosti',
  'installments.due.noDate': 'Bez data splatnosti',
  'installments.due.more': 'a dalších {count}',
};

export default costsInstallments;
