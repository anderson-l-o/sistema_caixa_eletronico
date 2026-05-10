import { IInventario } from "../models/IInventario";
import { IEstrategiaComposicao } from "./IEstrategiaComposicao";
import { EstrategiaMenurQuantidade } from "./EstrategiaMenurQuantidade";
import { EstrategiaPreservarAltoValor } from "./EstrategiaPreservarAltoValor";

/**
 * Limiar de "risco de escassez de notas pequenas".
 *
 * Se a proporção do valor em cédulas PEQUENAS (até R$50) for menor que
 * este percentual em relação ao total do caixa, ativa a estratégia de
 * preservação de notas grandes para forçar o uso das notas pequenas.
 *
 * Exemplo: LIMIAR = 0.30 → se menos de 30% do caixa são notas pequenas,
 * usa EstrategiaPreservarAltoValor.
 */
const LIMIAR_ESCASSEZ_NOTAS_PEQUENAS = 0.30;

/** Valor máximo (em centavos) de uma denominação considerada "pequena". */
const VALOR_MAXIMO_NOTA_PEQUENA = 5000; // R$50,00

/**
 * Seleciona automaticamente a estratégia de composição de cédulas
 * com base no estado atual do inventário.
 *
 * Regra de negócio:
 * - Se o caixa tiver proporção SAUDÁVEL de notas pequenas → usa a
 *   EstrategiaMenurQuantidade (entrega com o menor número de cédulas).
 * - Se o caixa estiver com POUCAS notas pequenas (risco de não ter troco
 *   para saques futuros) → usa a EstrategiaPreservarAltoValor para
 *   consumir ao máximo as notas pequenas disponíveis antes das grandes.
 */
export class SeletorEstrategia {
  private readonly estrategiaPadrao = new EstrategiaMenurQuantidade();
  private readonly estrategiaPreservacao = new EstrategiaPreservarAltoValor();

  /**
   * Avalia o inventário e retorna a estratégia mais adequada para o momento.
   * @param inventario - Estado atual do caixa.
   */
  selecionar(inventario: IInventario): IEstrategiaComposicao {
    const estoque = inventario.consultarEstoque();
    const totalCaixa = inventario.consultarValorTotal();

    if (totalCaixa === 0) {
      return this.estrategiaPadrao;
    }

    // Soma o valor total representado pelas notas pequenas no estoque
    let totalNotasPequenas = 0;
    for (const item of estoque.values()) {
      if (item.cedula.valorEmCentavos <= VALOR_MAXIMO_NOTA_PEQUENA) {
        totalNotasPequenas += item.cedula.valorEmCentavos * item.quantidade;
      }
    }

    const proporcaoNotasPequenas = totalNotasPequenas / totalCaixa;

    if (proporcaoNotasPequenas < LIMIAR_ESCASSEZ_NOTAS_PEQUENAS) {
      // Caixa está com poucas notas pequenas — prioriza consumi-las
      return this.estrategiaPreservacao;
    }

    // Estoque equilibrado — usa o algoritmo ótimo (menor quantidade de cédulas)
    return this.estrategiaPadrao;
  }
}
