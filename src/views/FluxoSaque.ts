import { CaixaEletronicoService } from "../services/CaixaEletronicoService";
import { RepositorioContas } from "../models/RepositorioContas";
import { ConsoleUI } from "../views/ConsoleUI";

/**
 * Fluxo responsável pela operação de saque do usuário autenticado.
 * Solicita o valor, delega ao serviço e exibe o resultado ou sugestões.
 */
export class FluxoSaque {
  constructor(
    private readonly service: CaixaEletronicoService,
    private readonly repositorioContas: RepositorioContas,
    private readonly ui: ConsoleUI
  ) {}

  /**
   * Inicia o fluxo de saque para a conta informada.
   * Ao terminar, chama o callback de retorno (ex: voltar ao menu do usuário).
   *
   * @param contaId   - ID da conta autenticada.
   * @param aoTerminar - Callback chamado ao concluir o fluxo.
   */
  iniciar(contaId: string, aoTerminar: () => void): void {
    console.log("\n── Saque ──────────────────────────────");

    this.ui.perguntar("  Valor a sacar (R$): ").then(valorStr => {
      const valorReais = parseFloat(valorStr.trim().replace(",", "."));
      if (isNaN(valorReais) || valorReais <= 0) {
        console.log("  ❌ Valor inválido.");
        this.iniciar(contaId, aoTerminar);
        return;
      }

      const valorEmCentavos = Math.round(valorReais * 100);
      const conta = this.repositorioContas.buscarPorId(contaId)!;

      // A estratégia é selecionada automaticamente pelo serviço
      const resultado = this.service.realizarSaque(conta, valorEmCentavos);

      if (resultado.sucesso) {
        console.log(`\n  ✅ ${resultado.mensagem}`);
        console.log("  Cédulas/moedas entregues:");
        resultado.cedulas!.forEach(c =>
          console.log(`     ${c.quantidade}x ${c.descricao}`)
        );
      } else {
        console.log(`\n  ❌ ${resultado.mensagem}`);
        if (resultado.sugestoes && resultado.sugestoes.length > 0) {
          console.log("  💡 Sugestões de valores disponíveis:");
          resultado.sugestoes.forEach(s => {
            const fmt = (s / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            console.log(`     • ${fmt}`);
          });
        }
      }

      this.ui.pausar().then(aoTerminar);
    });
  }
}
