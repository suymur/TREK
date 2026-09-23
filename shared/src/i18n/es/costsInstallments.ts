import type { TranslationStrings } from '../types';

const costsInstallments: TranslationStrings = {
  'installments.title': 'Plazos',
  'installments.hint':
    'Reparte el pago en el tiempo, p. ej. un anticipo ahora y el resto más tarde. Quién debe a quién no cambia.',
  'installments.add': 'Añadir plazo',
  'installments.label': 'Concepto',
  'installments.labelPlaceholder': 'Anticipo',
  'installments.amount': 'Importe',
  'installments.dueDate': 'Vence',
  'installments.paid': 'Pagado',
  'installments.markPaid': 'Marcar como pagado',
  'installments.markOpen': 'Marcar como pendiente',
  'installments.remove': 'Eliminar plazo',
  'installments.paidOf': 'Pagado {paid} de {total}',
  'installments.nextDue': 'Próximo vencimiento {date}',
  'installments.unscheduled': '{amount} aún sin planificar',
  'installments.overTotal': 'Los plazos suman {sum}, más que el total de {total}.',
  'installments.markPaidFailed': 'No se pudo actualizar el pago.',
  'installments.openAmount': '{amount} pendiente',
  'installments.due.title': 'Pagos pendientes',
  'installments.due.empty': 'No hay pagos pendientes.',
  'installments.due.overdue': 'Vencido',
  'installments.due.noDate': 'Sin fecha de vencimiento',
  'installments.due.more': '{count} más',
};

export default costsInstallments;
