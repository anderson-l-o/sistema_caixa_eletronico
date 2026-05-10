import { INotificador } from "./INotificador";

/**
 * Notificador que exibe eventos no console (stdout).
 * Útil para desenvolvimento e depuração.
 */
export class NotificadorConsole implements INotificador {
  notificar(mensagem: string): void {
    const agora = new Date();
    const timestamp = agora.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    console.log(`\x1b[36m[LOG ${timestamp}]\x1b[0m ${mensagem}`);
  }
}
