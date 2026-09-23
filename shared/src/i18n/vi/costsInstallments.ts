import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Trả góp',
  'installments.hint':
    'Chia khoản thanh toán theo thời gian, ví dụ đặt cọc bây giờ và trả phần còn lại sau. Ai nợ ai không thay đổi.',
  'installments.add': 'Thêm đợt thanh toán',
  'installments.label': 'Nhãn',
  'installments.labelPlaceholder': 'Đặt cọc',
  'installments.amount': 'Số tiền',
  'installments.dueDate': 'Hạn',
  'installments.paid': 'Đã trả',
  'installments.markPaid': 'Đánh dấu đã trả',
  'installments.markOpen': 'Đánh dấu chưa trả',
  'installments.remove': 'Xóa đợt thanh toán',
  'installments.paidOf': 'Đã trả {paid} trên {total}',
  'installments.nextDue': 'Hạn tiếp theo {date}',
  'installments.unscheduled': '{amount} chưa lên lịch',
  'installments.overTotal': 'Tổng các đợt là {sum}, nhiều hơn tổng {total}.',
  'installments.markPaidFailed': 'Không thể cập nhật khoản thanh toán.',
  'installments.openAmount': 'Còn {amount}',
  'installments.due.title': 'Khoản sắp đến hạn',
  'installments.due.empty': 'Không có khoản chưa trả.',
  'installments.due.overdue': 'Quá hạn',
  'installments.due.noDate': 'Không có hạn',
  'installments.due.more': 'thêm {count}',
};

export default costsInstallments;
