import * as readline from "readline";

/**
 * Utilitários de interface de linha de comando.
 * Encapsula o readline e métodos de exibição reutilizáveis por todos os fluxos.
 */
export class ConsoleUI {
  readonly rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /** Exibe uma pergunta e retorna a resposta do usuário. */
  perguntar(prompt: string): Promise<string> {
    return new Promise(resolve => this.rl.question(prompt, resolve));
  }

  /** Aguarda o usuário pressionar ENTER. */
  pausar(): Promise<void> {
    return this.perguntar("\n  Pressione ENTER para continuar...").then(() => undefined);
  }

  /** Limpa o terminal. */
  limparTela(): void {
    console.clear();
  }

  /** Exibe o banner de boas-vindas do sistema. */
  exibirBanner(): void {
    console.log("╔══════════════════════════════════════════╗");
    console.log("║      💳  CAIXA ELETRÔNICO  💳            ║");
    console.log("║         Sistema de Autoatendimento       ║");
    console.log("╚══════════════════════════════════════════╝");
  }

  /** Encerra o processo readline. */
  fechar(): void {
    this.rl.close();
  }
}
