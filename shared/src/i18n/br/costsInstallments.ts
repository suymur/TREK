import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Parcelas',
  'installments.hint':
    'Divida o pagamento ao longo do tempo, por ex. um sinal agora e o restante depois. Quem deve a quem não muda.',
  'installments.add': 'Adicionar parcela',
  'installments.label': 'Descrição',
  'installments.labelPlaceholder': 'Sinal',
  'installments.amount': 'Valor',
  'installments.dueDate': 'Vencimento',
  'installments.paid': 'Pago',
  'installments.markPaid': 'Marcar como pago',
  'installments.markOpen': 'Marcar como em aberto',
  'installments.remove': 'Remover parcela',
  'installments.paidOf': 'Pago {paid} de {total}',
  'installments.nextDue': 'Próximo vencimento {date}',
  'installments.unscheduled': '{amount} ainda não agendado',
  'installments.overTotal': 'As parcelas somam {sum}, mais que o total de {total}.',
  'installments.markPaidFailed': 'Não foi possível atualizar o pagamento.',
  'installments.openAmount': '{amount} em aberto',
  'installments.due.title': 'Pagamentos a vencer',
  'installments.due.empty': 'Nenhum pagamento em aberto.',
  'installments.due.overdue': 'Atrasado',
  'installments.due.noDate': 'Sem vencimento',
  'installments.due.more': 'mais {count}',
};

export default costsInstallments;
