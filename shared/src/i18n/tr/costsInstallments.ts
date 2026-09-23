import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Taksitler',
  'installments.hint': 'Ödemeyi zamana yayın, ör. şimdi kapora, kalanı sonra. Kimin kime borçlu olduğu değişmez.',
  'installments.add': 'Taksit ekle',
  'installments.label': 'Açıklama',
  'installments.labelPlaceholder': 'Kapora',
  'installments.amount': 'Tutar',
  'installments.dueDate': 'Vade',
  'installments.paid': 'Ödendi',
  'installments.markPaid': 'Ödendi olarak işaretle',
  'installments.markOpen': 'Açık olarak işaretle',
  'installments.remove': 'Taksiti kaldır',
  'installments.paidOf': '{total} tutarın {paid} kadarı ödendi',
  'installments.nextDue': 'Sonraki vade {date}',
  'installments.unscheduled': '{amount} henüz planlanmadı',
  'installments.unassigned': 'Unassigned',
  'installments.remainder': 'Remaining amount',
  'installments.splitInvalid':
    'Deposit shares must add up to each deposit and stay within each person’s expense share.',
  'installments.overTotal': 'Taksitlerin toplamı {sum}, toplam tutar olan {total} değerinden fazla.',
  'installments.markPaidFailed': 'Ödeme güncellenemedi.',
  'installments.openAmount': '{amount} açık',
  'installments.due.title': 'Vadesi gelen ödemeler',
  'installments.due.empty': 'Açık ödeme yok.',
  'installments.due.overdue': 'Gecikmiş',
  'installments.due.noDate': 'Vade tarihi yok',
  'installments.due.more': '{count} tane daha',
};

export default costsInstallments;
