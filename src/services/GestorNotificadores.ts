import { INotificador } from "../notifications/INotificador";

/**
 * Gerencia o ciclo de vida dos notificadores do sistema.
 *
 * Responsabilidade única: registrar notificadores e disparar
 * eventos para todos eles (padrão Observer).
 */
export class GestorNotificadores {
  private readonly notificadores: INotificador[] = [];

  /** Registra um notificador. Múltiplos notificadores são suportados. */
  registrar(notificador: INotificador): void {
    this.notificadores.push(notificador);
  }

  /** Dispara um evento para todos os notificadores registrados. */
  notificarTodos(mensagem: string): void {
    for (const notificador of this.notificadores) {
      notificador.notificar(mensagem);
    }
  }
}
