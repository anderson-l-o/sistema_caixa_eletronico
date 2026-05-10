import { ICedula } from "./ICedula";
import { IInventario } from "./IInventario";
import { ItemEstoque } from "./ItemEstoque";

/**
 * Implementação do inventário de cédulas e moedas do caixa eletrônico.
 * Utiliza um Map indexado pelo valor em centavos para acesso O(1).
 */
export class Inventario implements IInventario {
  /** Mapa interno: valorEmCentavos -> ItemEstoque */
  private readonly estoque: Map<number, ItemEstoque> = new Map();

  /**
   * Adiciona unidades de uma cédula ao estoque.
   * Cria a entrada se ainda não existir.
   */
  carregar(cedula: ICedula, quantidade: number): void {
    if (quantidade <= 0) {
      throw new Error(`Quantidade para carga deve ser positiva. Recebido: ${quantidade}`);
    }
    const item = this.estoque.get(cedula.valorEmCentavos);
    if (item) {
      item.quantidade += quantidade;
    } else {
      this.estoque.set(cedula.valorEmCentavos, { cedula, quantidade });
    }
  }

  /**
   * Remove unidades de uma cédula do estoque.
   * Lança erro se não houver saldo suficiente.
   */
  descarregar(cedula: ICedula, quantidade: number): void {
    if (quantidade <= 0) {
      throw new Error(`Quantidade para descarga deve ser positiva. Recebido: ${quantidade}`);
    }
    const item = this.estoque.get(cedula.valorEmCentavos);
    if (!item || item.quantidade < quantidade) {
      throw new Error(
        `Estoque insuficiente para ${cedula.descricao}. ` +
        `Disponível: ${item?.quantidade ?? 0}, Solicitado: ${quantidade}`
      );
    }
    item.quantidade -= quantidade;
    if (item.quantidade === 0) {
      this.estoque.delete(cedula.valorEmCentavos);
    }
  }

  /** Retorna a quantidade disponível de uma denominação. */
  consultarQuantidade(cedula: ICedula): number {
    return this.estoque.get(cedula.valorEmCentavos)?.quantidade ?? 0;
  }

  /** Calcula e retorna o valor total do caixa em centavos. */
  consultarValorTotal(): number {
    let total = 0;
    for (const item of this.estoque.values()) {
      total += item.cedula.valorEmCentavos * item.quantidade;
    }
    return total;
  }

  /** Retorna uma visão somente-leitura do estoque atual. */
  consultarEstoque(): ReadonlyMap<number, ItemEstoque> {
    return this.estoque;
  }

  /**
   * Aplica débitos ao estoque.
   * Recebe um Map de valorEmCentavos -> quantidadeADebitar.
   * Lança erro se alguma denominação não tiver saldo suficiente.
   */
  debitar(debitos: Map<number, number>): void {
    // Valida antes de aplicar (garante atomicidade)
    for (const [valorCentavos, qtd] of debitos.entries()) {
      const item = this.estoque.get(valorCentavos);
      if (!item || item.quantidade < qtd) {
        throw new Error(
          `Estoque insuficiente para débito de ${qtd}x (${valorCentavos / 100} centavos).`
        );
      }
    }
    // Aplica os débitos
    for (const [valorCentavos, qtd] of debitos.entries()) {
      const item = this.estoque.get(valorCentavos)!;
      item.quantidade -= qtd;
      if (item.quantidade === 0) {
        this.estoque.delete(valorCentavos);
      }
    }
  }
}
