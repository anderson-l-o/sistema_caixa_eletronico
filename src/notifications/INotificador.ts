/**
 * Contrato para notificadores de eventos do caixa eletrônico.
 * Qualquer implementação de notificação deve seguir esta interface.
 */
export interface INotificador {
  /** Registra/notifica um evento com uma mensagem descritiva. */
  notificar(mensagem: string): void;
}
