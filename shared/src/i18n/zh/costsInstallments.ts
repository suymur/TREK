import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': '分期付款',
  'installments.hint': '按时间拆分付款，例如现在付定金，之后付尾款。谁欠谁不会改变。',
  'installments.add': '添加分期',
  'installments.label': '名称',
  'installments.labelPlaceholder': '定金',
  'installments.amount': '金额',
  'installments.dueDate': '到期',
  'installments.paid': '已付',
  'installments.markPaid': '标记为已付',
  'installments.markOpen': '标记为未付',
  'installments.remove': '删除分期',
  'installments.paidOf': '已付 {paid} / {total}',
  'installments.nextDue': '下次到期 {date}',
  'installments.unscheduled': '{amount} 尚未安排',
  'installments.unassigned': 'Unassigned',
  'installments.remainder': 'Remaining amount',
  'installments.splitInvalid':
    'Deposit shares must add up to each deposit and stay within each person’s expense share.',
  'installments.overTotal': '分期合计 {sum}，超过总额 {total}。',
  'installments.markPaidFailed': '无法更新付款。',
  'installments.openAmount': '未付 {amount}',
  'installments.due.title': '待付款项',
  'installments.due.empty': '没有未付款项。',
  'installments.due.overdue': '已逾期',
  'installments.due.noDate': '无到期日',
  'installments.due.more': '还有 {count} 项',
};

export default costsInstallments;
