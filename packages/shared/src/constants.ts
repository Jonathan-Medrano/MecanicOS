export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING:       "Pendiente",
  IN_PROGRESS:   "En progreso",
  WAITING_PARTS: "Esperando repuestos",
  DONE:          "Listo para retirar",
  DELIVERED:     "Entregado",
  CANCELLED:     "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID:  "Sin cobrar",
  PARTIAL: "Pago parcial",
  PAID:    "Cobrado",
};

/** Argentina is UTC-3. Used to convert UTC timestamps to local AR dates. */
export const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
