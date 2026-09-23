import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Δόσεις',
  'installments.hint':
    'Μοιράστε την πληρωμή στον χρόνο, π.χ. προκαταβολή τώρα και το υπόλοιπο αργότερα. Το ποιος χρωστά σε ποιον δεν αλλάζει.',
  'installments.add': 'Προσθήκη δόσης',
  'installments.label': 'Περιγραφή',
  'installments.labelPlaceholder': 'Προκαταβολή',
  'installments.amount': 'Ποσό',
  'installments.dueDate': 'Λήξη',
  'installments.paid': 'Πληρώθηκε',
  'installments.markPaid': 'Σήμανση ως πληρωμένη',
  'installments.markOpen': 'Σήμανση ως ανοιχτή',
  'installments.remove': 'Αφαίρεση δόσης',
  'installments.paidOf': 'Πληρώθηκαν {paid} από {total}',
  'installments.nextDue': 'Επόμενη λήξη {date}',
  'installments.unscheduled': '{amount} δεν έχει προγραμματιστεί ακόμη',
  'installments.unassigned': 'Unassigned',
  'installments.remainder': 'Remaining amount',
  'installments.splitInvalid':
    'Deposit shares must add up to each deposit and stay within each person’s expense share.',
  'installments.overTotal': 'Οι δόσεις αθροίζουν {sum}, περισσότερο από το σύνολο {total}.',
  'installments.markPaidFailed': 'Δεν ήταν δυνατή η ενημέρωση της πληρωμής.',
  'installments.openAmount': '{amount} ανοιχτά',
  'installments.due.title': 'Πληρωμές προς εξόφληση',
  'installments.due.empty': 'Καμία ανοιχτή πληρωμή.',
  'installments.due.overdue': 'Εκπρόθεσμη',
  'installments.due.noDate': 'Χωρίς ημερομηνία λήξης',
  'installments.due.more': '{count} ακόμη',
};

export default costsInstallments;
