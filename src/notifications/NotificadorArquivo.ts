import * as fs from "fs";
import * as path from "path";
import { INotificador } from "./INotificador";

/**
 * Notificador que registra eventos em um arquivo de texto (log).
 * Cada linha contém: [DATA HORA] MENSAGEM
 */
export class NotificadorArquivo implements INotificador {
  private readonly caminhoArquivo: string;

  constructor(nomeArquivo: string = "caixa_eletronico.log") {
    // Salva o log na pasta raiz do projeto
    this.caminhoArquivo = path.resolve(process.cwd(), nomeArquivo);
    // Garante que o arquivo existe (cria se necessário)
    if (!fs.existsSync(this.caminhoArquivo)) {
      fs.writeFileSync(this.caminhoArquivo, "", "utf-8");
    }
  }

  /**
   * Registra a mensagem no arquivo com timestamp.
   * Formato: [DD/MM/AAAA HH:MM:SS] mensagem
   */
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
    const linha = `[${timestamp}] ${mensagem}\n`;
    fs.appendFileSync(this.caminhoArquivo, linha, "utf-8");
  }
}
