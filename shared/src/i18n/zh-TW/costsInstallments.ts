import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': '分期付款',
  'installments.hint': '依時間拆分付款，例如現在付訂金，之後付尾款。誰欠誰不會改變。',
  'installments.add': '新增分期',
  'installments.label': '名稱',
  'installments.labelPlaceholder': '訂金',
  'installments.amount': '金額',
  'installments.dueDate': '到期',
  'installments.paid': '已付',
  'installments.markPaid': '標記為已付',
  'installments.markOpen': '標記為未付',
  'installments.remove': '刪除分期',
  'installments.paidOf': '已付 {paid} / {total}',
  'installments.nextDue': '下次到期 {date}',
  'installments.unscheduled': '{amount} 尚未安排',
  'installments.overTotal': '分期合計 {sum}，超過總額 {total}。',
  'installments.markPaidFailed': '無法更新付款。',
  'installments.openAmount': '未付 {amount}',
  'installments.due.title': '待付款項',
  'installments.due.empty': '沒有未付款項。',
  'installments.due.overdue': '已逾期',
  'installments.due.noDate': '無到期日',
  'installments.due.more': '還有 {count} 項',
};

export default costsInstallments;
