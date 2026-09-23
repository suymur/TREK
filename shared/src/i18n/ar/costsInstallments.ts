import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'الدفعات',
  'installments.hint': 'قسّم الدفع على مراحل، مثل عربون الآن والباقي لاحقًا. لا يتغير من يدين لمن.',
  'installments.add': 'إضافة دفعة',
  'installments.label': 'الوصف',
  'installments.labelPlaceholder': 'عربون',
  'installments.amount': 'المبلغ',
  'installments.dueDate': 'الاستحقاق',
  'installments.paid': 'مدفوع',
  'installments.markPaid': 'تعليم كمدفوع',
  'installments.markOpen': 'تعليم كغير مدفوع',
  'installments.remove': 'إزالة الدفعة',
  'installments.paidOf': 'دُفع {paid} من {total}',
  'installments.nextDue': 'الاستحقاق التالي {date}',
  'installments.unscheduled': '{amount} غير مجدول بعد',
  'installments.overTotal': 'مجموع الدفعات {sum}، أكثر من الإجمالي {total}.',
  'installments.markPaidFailed': 'تعذّر تحديث الدفعة.',
  'installments.openAmount': '{amount} مستحق',
  'installments.due.title': 'الدفعات المستحقة',
  'installments.due.empty': 'لا توجد دفعات مفتوحة.',
  'installments.due.overdue': 'متأخرة',
  'installments.due.noDate': 'بلا تاريخ استحقاق',
  'installments.due.more': '{count} أخرى',
};

export default costsInstallments;
