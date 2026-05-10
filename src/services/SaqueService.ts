import { IConta } from "../models/IConta";
import { IInventario } from "../models/IInventario";
import { IEstrategiaComposicao } from "../strategies/IEstrategiaComposicao";
import { SeletorEstrategia } from "../strategies/SeletorEstrategia";
import { DENOMINACOES } from "../models/Denominacoes";
import { Formatador } from "../utils/Formatador";
import { GestorNotificadores } from "./GestorNotificadores";
import { RepositorioMovimentacoes } from "../models/RepositorioMovimentacoes";

/** Resultado de uma operação de saque. */
export interface ResultadoSaque {
  sucesso: boolean;
  mensagem: string;
  /** Cédulas entregues (quando sucesso = true). */
  cedulas?: Array<{ descricao: string; quantidade: number }>;
  /** Valores alternativos viáveis (quando sucesso = false por impossibilidade de composição). */
  sugestoes?: number[];
}

/**
 * Serviço responsável pela operação de saque do caixa eletrônico.
 *
 * Responsabilidade única: validar, compor e executar saques,
 * além de calcular sugestões quando a composição é impossível.
 */
export class SaqueService {
  private readonly seletorEstrategia = new SeletorEstrategia();

  private static readonly MAX_SUGESTOES = 3;
  private static readonly MAX_PASSOS    = 200;

  constructor(
    private readonly inventario: IInventario,
    private readonly gestor: GestorNotificadores,
    private readonly repoMovimentacoes: RepositorioMovimentacoes
  ) {}

  /**
   * Realiza o saque para uma conta de usuário.
   *
   * A estratégia de composição é escolhida automaticamente pelo SeletorEstrategia
   * com base no estado atual do inventário.
   */
  realizarSaque(conta: IConta, valorEmCentavos: number): ResultadoSaque {
    const validacao = this.validar(conta, valorEmCentavos);
    if (validacao) return validacao;

    const estrategia = this.seletorEstrategia.selecionar(this.inventario);
    const resultado  = estrategia.compor(valorEmCentavos, this.inventario);

    if (!resultado.sucesso || !resultado.composicao) {
      return this.retornarImpossivelComSugestoes(conta, valorEmCentavos, estrategia);
    }

    this.inventario.debitar(resultado.composicao);
    conta.debitar(valorEmCentavos);

    const cedulas        = this.montarDetalhamento(resultado.composicao);
    const valorFormatado = Formatador.brl(valorEmCentavos);

    this.gestor.notificarTodos(
      `[SAQUE] Conta "${conta.id}" sacou ${valorFormatado}. ` +
      `Cédulas: ${cedulas.map(c => `${c.quantidade}x ${c.descricao}`).join(", ")}`
    );
    this.repoMovimentacoes.registrar(
      conta.id,
      "SAQUE_REALIZADO",
      valorEmCentavos,
      `Saque de ${valorFormatado}. Cédulas: ${cedulas.map(c => `${c.quantidade}x ${c.descricao}`).join(", ")}`
    );

    return {
      sucesso: true,
      mensagem: `Saque de ${valorFormatado} realizado com sucesso!`,
      cedulas,
    };
  }

  // ─── Validações ───────────────────────────────────────────────────────────

  /** Executa todas as validações de pré-condição. Retorna um ResultadoSaque de erro ou null. */
  private validar(conta: IConta, valorEmCentavos: number): ResultadoSaque | null {
    if (valorEmCentavos <= 0) {
      return { sucesso: false, mensagem: "O valor do saque deve ser positivo." };
    }

    if (conta.saldoEmCentavos < valorEmCentavos) {
      const msg = `Saldo insuficiente. Saldo: ${Formatador.brl(conta.saldoEmCentavos)} | Solicitado: ${Formatador.brl(valorEmCentavos)}.`;
      this.gestor.notificarTodos(`[SAQUE NEGADO] Conta "${conta.id}" - ${msg}`);
      this.repoMovimentacoes.registrar(conta.id, "SAQUE_NEGADO", valorEmCentavos, msg);
      return { sucesso: false, mensagem: msg };
    }

    if (this.inventario.consultarValorTotal() < valorEmCentavos) {
      const msg = `Caixa sem fundos suficientes para o saque de ${Formatador.brl(valorEmCentavos)}.`;
      this.gestor.notificarTodos(`[SAQUE NEGADO] Conta "${conta.id}" - ${msg}`);
      this.repoMovimentacoes.registrar(conta.id, "SAQUE_NEGADO", valorEmCentavos, msg);
      return { sucesso: false, mensagem: msg };
    }

    return null;
  }

  // ─── Sugestões de Valores Alternativos ───────────────────────────────────

  private retornarImpossivelComSugestoes(
    conta: IConta,
    valorEmCentavos: number,
    estrategia: IEstrategiaComposicao
  ): ResultadoSaque {
    const sugestoes      = this.calcularSugestoes(valorEmCentavos, estrategia);
    const valorFormatado = Formatador.brl(valorEmCentavos);
    const msg =
      `Impossível entregar ${valorFormatado} com as cédulas disponíveis no momento. ` +
      `O caixa possui o valor, mas não consegue compô-lo com as notas atuais.`;

    this.gestor.notificarTodos(`[SAQUE IMPOSSÍVEL] Conta "${conta.id}" - ${msg}`);
    this.repoMovimentacoes.registrar(conta.id, "SAQUE_IMPOSSIVEL", valorEmCentavos, msg);
    return { sucesso: false, mensagem: msg, sugestoes };
  }

  /**
   * Busca valores alternativos próximos que o caixa consegue compor.
   * Retorna até 3 sugestões abaixo e 3 acima, ordenadas do mais próximo ao mais distante.
   */
  private calcularSugestoes(
    valorEmCentavos: number,
    estrategia: IEstrategiaComposicao
  ): number[] {
    const denominacoes = Array.from(this.inventario.consultarEstoque().keys()).sort((a, b) => a - b);
    if (denominacoes.length === 0) return [];

    const menor      = denominacoes[0];
    const baseAbaixo = Math.floor(valorEmCentavos / menor) * menor;
    const baseAcima  = Math.ceil(valorEmCentavos  / menor) * menor;

    const abaixo: number[] = [];
    const acima:  number[] = [];

    for (let i = 0; i < SaqueService.MAX_PASSOS; i++) {
      this.tentarCandidato(baseAbaixo - i * menor, valorEmCentavos, estrategia, abaixo, true);
      this.tentarCandidato(baseAcima  + i * menor, valorEmCentavos, estrategia, acima,  false);

      if (abaixo.length >= SaqueService.MAX_SUGESTOES && acima.length >= SaqueService.MAX_SUGESTOES) break;
    }

    return [...abaixo, ...acima];
  }

  private tentarCandidato(
    candidato: number,
    valorOriginal: number,
    estrategia: IEstrategiaComposicao,
    lista: number[],
    requerPositivo: boolean
  ): void {
    if (lista.length >= SaqueService.MAX_SUGESTOES) return;
    if (candidato === valorOriginal) return;
    if (requerPositivo && candidato <= 0) return;
    if (estrategia.compor(candidato, this.inventario).sucesso) {
      lista.push(candidato);
    }
  }

  // ─── Detalhamento de Cédulas ──────────────────────────────────────────────

  /** Converte o Map de composição para lista descritiva, ordenada do maior ao menor valor. */
  private montarDetalhamento(
    composicao: Map<number, number>
  ): Array<{ descricao: string; quantidade: number }> {
    return Array.from(composicao.entries())
      .map(([valorCentavos, quantidade]) => ({
        descricao: DENOMINACOES.find(c => c.valorEmCentavos === valorCentavos)?.descricao
                   ?? Formatador.brl(valorCentavos),
        quantidade,
      }))
      .sort((a, b) => this.extrairNumero(b.descricao) - this.extrairNumero(a.descricao));
  }

  private extrairNumero(valorFormatado: string): number {
    return parseFloat(valorFormatado.replace(/[^\d,]/g, "").replace(",", "."));
  }
}
