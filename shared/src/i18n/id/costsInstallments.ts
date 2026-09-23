import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Cicilan',
  'installments.hint':
    'Bagi pembayaran dari waktu ke waktu, mis. uang muka sekarang dan sisanya nanti. Siapa berutang kepada siapa tidak berubah.',
  'installments.add': 'Tambah cicilan',
  'installments.label': 'Keterangan',
  'installments.labelPlaceholder': 'Uang muka',
  'installments.amount': 'Jumlah',
  'installments.dueDate': 'Jatuh tempo',
  'installments.paid': 'Lunas',
  'installments.markPaid': 'Tandai lunas',
  'installments.markOpen': 'Tandai belum lunas',
  'installments.remove': 'Hapus cicilan',
  'installments.paidOf': 'Terbayar {paid} dari {total}',
  'installments.nextDue': 'Jatuh tempo berikutnya {date}',
  'installments.unscheduled': '{amount} belum dijadwalkan',
  'installments.unassigned': 'Unassigned',
  'installments.remainder': 'Remaining amount',
  'installments.splitInvalid':
    'Deposit shares must add up to each deposit and stay within each person’s expense share.',
  'installments.overTotal': 'Total cicilan {sum}, lebih dari total {total}.',
  'installments.markPaidFailed': 'Pembayaran tidak dapat diperbarui.',
  'installments.openAmount': '{amount} belum dibayar',
  'installments.due.title': 'Pembayaran jatuh tempo',
  'installments.due.empty': 'Tidak ada pembayaran terbuka.',
  'installments.due.overdue': 'Terlambat',
  'installments.due.noDate': 'Tanpa tanggal jatuh tempo',
  'installments.due.more': '{count} lagi',
};

export default costsInstallments;
