import { IInventario } from "../models/IInventario";
import { DENOMINACOES } from "../models/Denominacoes";
import { Formatador } from "../utils/Formatador";
import { GestorNotificadores } from "./GestorNotificadores";

/**
 * Serviço responsável pelas operações de estoque do caixa eletrônico.
 *
 * Responsabilidade única: carregar, descarregar e consultar cédulas
 * no inventário, notificando os observadores a cada operação.
 */
export class EstoqueService {
  constructor(
    private readonly inventario: IInventario,
    private readonly gestor: GestorNotificadores
  ) {}

  /** Carrega cédulas no inventário. Requer identificação do operador. */
  carregar(operadorId: string, valorEmCentavos: number, quantidade: number): void {
    const cedula = this.buscarCedula(valorEmCentavos);
    this.inventario.carregar(cedula, quantidade);
    this.gestor.notificarTodos(
      `[CARGA] Operador "${operadorId}" adicionou ${quantidade}x ${cedula.descricao} ao estoque.`
    );
  }

  /** Descarrega cédulas do inventário. */
  descarregar(operadorId: string, valorEmCentavos: number, quantidade: number): void {
    const cedula = this.buscarCedula(valorEmCentavos);
    this.inventario.descarregar(cedula, quantidade);
    this.gestor.notificarTodos(
      `[DESCARGA] Operador "${operadorId}" removeu ${quantidade}x ${cedula.descricao} do estoque.`
    );
  }

  /** Retorna o valor total disponível no caixa (em centavos). */
  consultarValorTotal(): number {
    return this.inventario.consultarValorTotal();
  }

  /** Retorna o estado atual do estoque formatado para exibição, ordenado do maior ao menor valor. */
  consultarEstoque(): Array<{ descricao: string; quantidade: number; subtotal: string }> {
    const itens = Array.from(this.inventario.consultarEstoque().values()).map(item => ({
      descricao: item.cedula.descricao,
      quantidade: item.quantidade,
      subtotal: Formatador.brl(item.cedula.valorEmCentavos * item.quantidade),
    }));

    return itens.sort((a, b) => {
      const valorA = this.extrairNumero(a.subtotal);
      const valorB = this.extrairNumero(b.subtotal);
      return valorB - valorA;
    });
  }

  /** Expõe o inventário bruto para serviços que precisam inspecioná-lo (ex: SaqueService). */
  get inventarioRaw(): IInventario {
    return this.inventario;
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private buscarCedula(valorEmCentavos: number) {
    const cedula = DENOMINACOES.find(c => c.valorEmCentavos === valorEmCentavos);
    if (!cedula) {
      throw new Error(`Denominação de ${Formatador.brl(valorEmCentavos)} não suportada.`);
    }
    return cedula;
  }

  private extrairNumero(valorFormatado: string): number {
    return parseFloat(valorFormatado.replace(/[^\d,]/g, "").replace(",", "."));
  }
}
