import { IInventario } from "../models/IInventario";
import { ResultadoComposicao } from "./ResultadoComposicao";
export { ResultadoComposicao } from "./ResultadoComposicao";

/**
 * Contrato (Strategy) para algoritmos de composição de cédulas no saque.
 * Qualquer nova estratégia deve implementar esta interface.
 */
export interface IEstrategiaComposicao {
  /** Nome descritivo da estratégia, para exibição ao usuário. */
  readonly nome: string;

  /**
   * Tenta compor o valor solicitado usando o inventário disponível.
   * @param valorEmCentavos - Valor a ser sacado.
   * @param inventario - Estado atual do inventário do caixa.
   */
  compor(valorEmCentavos: number, inventario: IInventario): ResultadoComposicao;
}
