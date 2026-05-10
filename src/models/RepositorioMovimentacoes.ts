import { Movimentacao, TipoMovimentacao } from "./Movimentacao";
import { Formatador } from "../utils/Formatador";

/**
 * Repositório em memória de movimentações financeiras.
 *
 * Responsabilidade única: registrar e consultar o histórico
 * de operações por conta de usuário.
 */
export class RepositorioMovimentacoes {
  private readonly movimentacoes: Movimentacao[] = [];
  private sequencial = 0;

  /**
   * Registra uma nova movimentação.
   * @param contaId  - ID da conta envolvida
   * @param tipo     - Tipo da operação
   * @param valor    - Valor em centavos
   * @param descricao - Mensagem descritiva da operação
   */
  registrar(
    contaId: string,
    tipo: TipoMovimentacao,
    valor: number,
    descricao: string
  ): void {
    this.movimentacoes.push({
      id:            ++this.sequencial,
      contaId,
      tipo,
      valor,
      valorFormatado: Formatador.brl(valor),
      descricao,
      dataHora:      new Date().toISOString(),
    });
  }

  /**
   * Retorna todas as movimentações de uma conta, da mais recente para a mais antiga.
   * @param contaId - ID da conta a consultar
   */
  buscarPorConta(contaId: string): Movimentacao[] {
    return this.movimentacoes
      .filter(m => m.contaId === contaId)
      .slice()
      .reverse();
  }

  /**
   * Retorna todas as movimentações do sistema, da mais recente para a mais antiga.
   */
  listarTodas(): Movimentacao[] {
    return this.movimentacoes.slice().reverse();
  }
}
