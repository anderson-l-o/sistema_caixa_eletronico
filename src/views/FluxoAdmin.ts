import { CaixaEletronicoService } from "../services/CaixaEletronicoService";
import { ConsoleUI } from "../views/ConsoleUI";
import { DENOMINACOES } from "../models/Denominacoes";

/**
 * Fluxo do painel do operador (admin).
 * Permite visualizar estoque e carregar/descarregar cédulas.
 */
export class FluxoAdmin {
  constructor(
    private readonly service: CaixaEletronicoService,
    private readonly ui: ConsoleUI
  ) {}

  /**
   * Exibe o menu do operador.
   * @param aoSair - Callback chamado ao escolher "Voltar".
   */
  iniciar(aoSair: () => void): void {
    const totalFormatado = (this.service.consultarValorTotal() / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    console.log("\n╔══════════════════════════════════════╗");
    console.log("║        PAINEL DO OPERADOR            ║");
    console.log(`║  TOTAL NO CAIXA: ${totalFormatado.padEnd(20)}║`);
    console.log("╠══════════════════════════════════════╣");
    console.log("║  [1] Ver Estoque                     ║");
    console.log("║  [2] Carregar Cédulas                ║");
    console.log("║  [3] Descarregar Cédulas             ║");
    console.log("║  [4] Voltar                          ║");
    console.log("╚══════════════════════════════════════╝");

    const acoes: Record<string, () => void> = {
      "1": () => { this.exibirEstoque(); this.ui.pausar().then(() => this.iniciar(aoSair)); },
      "2": () => this.fluxoCarga("carregar",    () => this.iniciar(aoSair)),
      "3": () => this.fluxoCarga("descarregar", () => this.iniciar(aoSair)),
      "4": () => aoSair(),
    };

    this.ui.perguntar("\n  Opção: ").then(opcao => {
      const acao = acoes[opcao.trim()] ?? (() => {
        console.log("\n  ❌ Opção inválida.");
        this.iniciar(aoSair);
      });
      acao();
    });
  }

  // ─── Exibição de Estoque ──────────────────────────────────────────────────

  private exibirEstoque(): void {
    console.log("\n── Estoque Atual ───────────────────────");
    const estoque = this.service.consultarEstoque();
    if (estoque.length === 0) {
      console.log("  Caixa vazio.");
      return;
    }
    console.log("  Denominação     Qtd   Subtotal");
    console.log("  ─────────────────────────────────");
    for (const item of estoque) {
      console.log(
        `  ${item.descricao.padEnd(14)}  ${String(item.quantidade).padStart(4)}   ${item.subtotal}`
      );
    }
    const totalFormatado = (this.service.consultarValorTotal() / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    console.log("  ─────────────────────────────────");
    console.log(`  TOTAL: ${totalFormatado}`);
  }

  // ─── Carga / Descarga de Cédulas ──────────────────────────────────────────

  private fluxoCarga(operacao: "carregar" | "descarregar", aoTerminar: () => void): void {
    console.log("\n── Denominações Disponíveis ─────────────");
    DENOMINACOES.forEach((c, i) =>
      console.log(`  [${String(i + 1).padStart(2)}] ${c.descricao}`)
    );

    this.ui.perguntar("\n  Número da denominação: ").then(numStr => {
      const indice = parseInt(numStr.trim()) - 1;
      if (isNaN(indice) || indice < 0 || indice >= DENOMINACOES.length) {
        console.log("  ❌ Denominação inválida.");
        this.fluxoCarga(operacao, aoTerminar);
        return;
      }
      const cedula = DENOMINACOES[indice];

      this.ui.perguntar(
        `  Quantidade para ${operacao === "carregar" ? "adicionar" : "remover"}: `
      ).then(qtdStr => {
        const quantidade = parseInt(qtdStr.trim());
        if (isNaN(quantidade) || quantidade <= 0) {
          console.log("  ❌ Quantidade inválida.");
          this.fluxoCarga(operacao, aoTerminar);
          return;
        }
        try {
          if (operacao === "carregar") {
            this.service.carregarCedulas("admin", cedula.valorEmCentavos, quantidade);
            console.log(`\n  ✅ ${quantidade}x ${cedula.descricao} adicionadas ao estoque.`);
          } else {
            this.service.descarregarCedulas("admin", cedula.valorEmCentavos, quantidade);
            console.log(`\n  ✅ ${quantidade}x ${cedula.descricao} removidas do estoque.`);
          }
        } catch (e: unknown) {
          console.log(`\n  ❌ Erro: ${(e as Error).message}`);
        }
        this.ui.pausar().then(aoTerminar);
      });
    });
  }
}
