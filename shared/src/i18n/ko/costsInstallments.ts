import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': '분할 결제',
  'installments.hint':
    '결제를 시기별로 나눕니다(예: 지금 계약금, 나중에 잔금). 누가 누구에게 갚을지는 바뀌지 않습니다.',
  'installments.add': '분할 결제 추가',
  'installments.label': '항목명',
  'installments.labelPlaceholder': '계약금',
  'installments.amount': '금액',
  'installments.dueDate': '기한',
  'installments.paid': '결제됨',
  'installments.markPaid': '결제됨으로 표시',
  'installments.markOpen': '미결제로 표시',
  'installments.remove': '분할 결제 삭제',
  'installments.paidOf': '{total} 중 {paid} 결제됨',
  'installments.nextDue': '다음 기한 {date}',
  'installments.unscheduled': '{amount} 아직 일정 없음',
  'installments.overTotal': '분할 결제 합계 {sum}이(가) 총액 {total}보다 많습니다.',
  'installments.markPaidFailed': '결제를 업데이트하지 못했습니다.',
  'installments.openAmount': '{amount} 미결제',
  'installments.due.title': '결제 예정',
  'installments.due.empty': '미결제 항목이 없습니다.',
  'installments.due.overdue': '기한 초과',
  'installments.due.noDate': '기한 없음',
  'installments.due.more': '{count}개 더',
};

export default costsInstallments;
