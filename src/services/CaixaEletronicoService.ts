import { IConta } from "../models/IConta";
import { IInventario } from "../models/IInventario";
import { INotificador } from "../notifications/INotificador";
import { GestorNotificadores } from "./GestorNotificadores";
import { EstoqueService } from "./EstoqueService";
import { SaqueService } from "./SaqueService";
import { RepositorioMovimentacoes } from "../models/RepositorioMovimentacoes";
import { Movimentacao, TipoMovimentacao } from "../models/Movimentacao";

export { ResultadoSaque } from "./SaqueService";

/**
 * Fachada principal do caixa eletrônico (padrão Facade).
 *
 * Mantém a API pública estável enquanto delega cada responsabilidade
 * ao serviço especializado correspondente:
 *   - GestorNotificadores → padrão Observer
 *   - EstoqueService      → operações de inventário
 *   - SaqueService        → lógica de saque e sugestões
 */
export class CaixaEletronicoService {
  private readonly gestor:             GestorNotificadores;
  private readonly estoque:            EstoqueService;
  private readonly saque:              SaqueService;
  private readonly repoMovimentacoes:  RepositorioMovimentacoes;

  constructor(inventario: IInventario) {
    this.gestor            = new GestorNotificadores();
    this.estoque           = new EstoqueService(inventario, this.gestor);
    this.repoMovimentacoes = new RepositorioMovimentacoes();
    this.saque             = new SaqueService(inventario, this.gestor, this.repoMovimentacoes);
  }

  // ─── Notificadores ────────────────────────────────────────────────────────

  registrarNotificador(notificador: INotificador): void {
    this.gestor.registrar(notificador);
  }

  // ─── Estoque ──────────────────────────────────────────────────────────────

  carregarCedulas(operadorId: string, valorEmCentavos: number, quantidade: number): void {
    this.estoque.carregar(operadorId, valorEmCentavos, quantidade);
  }

  descarregarCedulas(operadorId: string, valorEmCentavos: number, quantidade: number): void {
    this.estoque.descarregar(operadorId, valorEmCentavos, quantidade);
  }

  consultarValorTotal(): number {
    return this.estoque.consultarValorTotal();
  }

  consultarEstoque(): Array<{ descricao: string; quantidade: number; subtotal: string }> {
    return this.estoque.consultarEstoque();
  }

  // ─── Saque ────────────────────────────────────────────────────────────────

  realizarSaque(conta: IConta, valorEmCentavos: number) {
    return this.saque.realizarSaque(conta, valorEmCentavos);
  }

  // ─── Movimentações ───────────────────────────────────────────────────────

  consultarMovimentacoes(contaId: string): Movimentacao[] {
    return this.repoMovimentacoes.buscarPorConta(contaId);
  }

  listarTodasMovimentacoes(): Movimentacao[] {
    return this.repoMovimentacoes.listarTodas();
  }

  registrarMovimentacao(
    contaId: string,
    tipo: TipoMovimentacao,
    valor: number,
    descricao: string
  ): void {
    this.repoMovimentacoes.registrar(contaId, tipo, valor, descricao);
    // Também notifica para registrar no arquivo de log
    const tipoStr = tipo === "CARGA" ? "[CARGA]" : `[${tipo}]`;
    const mensagemLog = `${tipoStr} ${descricao}`;
    this.gestor.notificarTodos(mensagemLog);
  }
}
