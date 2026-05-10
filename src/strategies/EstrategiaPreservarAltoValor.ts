import { IInventario } from "../models/IInventario";
import { IEstrategiaComposicao, ResultadoComposicao } from "./IEstrategiaComposicao";

/**
 * Estratégia Alternativa: Preservação de Cédulas de Alto Valor.
 *
 * Objetivo: usar as cédulas de MENOR valor o máximo possível, preservando
 * as de maior valor (R$100, R$200, R$500) para operações futuras.
 *
 * Algoritmo:
 * 1. Fase de viabilidade — DP booleana para verificar se o valor é alcançável.
 * 2. Fase de reconstrução — percorre as denominações da MENOR para a MAIOR,
 *    usando o máximo possível de cada uma, garantindo a composição exata.
 */
export class EstrategiaPreservarAltoValor implements IEstrategiaComposicao {
  readonly nome = "Preservar Cédulas de Alto Valor (Usa Menores Primeiro)";

  compor(valorEmCentavos: number, inventario: IInventario): ResultadoComposicao {
    const estoque = inventario.consultarEstoque();

    // Denominações disponíveis: do MENOR para o MAIOR valor
    const denominacoes = Array.from(estoque.values())
      .map(item => ({ valor: item.cedula.valorEmCentavos, qtdDisponivel: item.quantidade }))
      .sort((a, b) => a.valor - b.valor);

    // ── Fase 1: DP booleana — verifica se a composição exata é possível ──────
    // reachable[v] = true se é possível compor exatamente v centavos
    const reachable: boolean[] = new Array(valorEmCentavos + 1).fill(false);
    reachable[0] = true;

    for (const { valor, qtdDisponivel } of denominacoes) {
      // Percorre de CIMA para BAIXO para respeitar o limite de estoque (bounded knapsack)
      for (let v = valorEmCentavos; v >= valor; v--) {
        if (reachable[v]) continue;
        for (let k = 1; k <= qtdDisponivel && k * valor <= v; k++) {
          if (reachable[v - k * valor]) {
            reachable[v] = true;
            break;
          }
        }
      }
    }

    if (!reachable[valorEmCentavos]) {
      return {
        sucesso: false,
        mensagem: "Não foi possível compor o valor preservando as cédulas de alto valor.",
      };
    }

    // ── Fase 2: Reconstrução greedy — usa o máximo da menor nota possível ────
    // Para cada denominação (menor → maior), usa a maior quantidade que ainda
    // deixa o restante alcançável pela DP já calculada.
    const composicao = new Map<number, number>();
    let restante = valorEmCentavos;

    for (const { valor, qtdDisponivel } of denominacoes) {
      if (restante === 0) break;

      // Tenta usar a maior quantidade possível desta denominação
      // que ainda deixe o restante alcançável
      const maxUsavel = Math.min(qtdDisponivel, Math.floor(restante / valor));
      for (let k = maxUsavel; k >= 1; k--) {
        const sobra = restante - k * valor;
        if (reachable[sobra]) {
          composicao.set(valor, k);
          restante = sobra;
          break;
        }
      }
    }

    if (restante !== 0) {
      return {
        sucesso: false,
        mensagem: "Falha inesperada na composição. Tente novamente.",
      };
    }

    const totalCedulas = Array.from(composicao.values()).reduce((a, b) => a + b, 0);
    return {
      sucesso: true,
      composicao,
      mensagem: `Composição encontrada com ${totalCedulas} cédula(s)/moeda(s), preservando notas grandes.`,
    };
  }
}
