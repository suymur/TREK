import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': '分割払い',
  'installments.hint': '支払いを時期ごとに分けます（例：今は手付金、後で残金）。誰が誰にいくら払うかは変わりません。',
  'installments.add': '分割払いを追加',
  'installments.label': 'ラベル',
  'installments.labelPlaceholder': '手付金',
  'installments.amount': '金額',
  'installments.dueDate': '期日',
  'installments.paid': '支払済み',
  'installments.markPaid': '支払済みにする',
  'installments.markOpen': '未払いに戻す',
  'installments.remove': '分割払いを削除',
  'installments.paidOf': '{total}のうち{paid}支払済み',
  'installments.nextDue': '次の期日 {date}',
  'installments.unscheduled': '{amount}は未予定',
  'installments.overTotal': '分割払いの合計は{sum}で、総額{total}を超えています。',
  'installments.markPaidFailed': '支払いを更新できませんでした。',
  'installments.openAmount': '未払い {amount}',
  'installments.due.title': '支払い予定',
  'installments.due.empty': '未払いの支払いはありません。',
  'installments.due.overdue': '期限切れ',
  'installments.due.noDate': '期日なし',
  'installments.due.more': 'ほか{count}件',
};

export default costsInstallments;
