import { ICedula } from "./ICedula";
import { ItemEstoque } from "./ItemEstoque";

/**
 * Contrato para o inventário de cédulas e moedas do caixa eletrônico.
 * Define todas as operações de consulta e manipulação do estoque.
 */
export interface IInventario {
  /** Adiciona unidades de uma determinada cédula ao estoque. */
  carregar(cedula: ICedula, quantidade: number): void;

  /** Remove unidades de uma determinada cédula do estoque. */
  descarregar(cedula: ICedula, quantidade: number): void;

  /** Retorna a quantidade disponível de uma denominação específica. */
  consultarQuantidade(cedula: ICedula): number;

  /** Retorna o valor total disponível no caixa (em centavos). */
  consultarValorTotal(): number;

  /** Retorna uma cópia do estado atual do estoque para leitura. */
  consultarEstoque(): ReadonlyMap<number, ItemEstoque>;

  /** Aplica um conjunto de débitos ao estoque (usado no saque). */
  debitar(debitos: Map<number, number>): void;
}
