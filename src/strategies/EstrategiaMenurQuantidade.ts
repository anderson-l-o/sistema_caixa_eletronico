import { IInventario } from "../models/IInventario";
import { IEstrategiaComposicao, ResultadoComposicao } from "./IEstrategiaComposicao";

/**
 * Estratégia Padrão: Menor Quantidade de Cédulas.
 *
 * Utiliza programação dinâmica (bounded knapsack) para encontrar a combinação
 * com o MENOR número total de cédulas/moedas que compõe o valor exato.
 * Como prioriza minimizar a quantidade, naturalmente usará as notas de
 * MAIOR valor primeiro (ex: R$200, R$100...).
 */
export class EstrategiaMenurQuantidade implements IEstrategiaComposicao {
  readonly nome = "Menor Quantidade de Cédulas";

  compor(valorEmCentavos: number, inventario: IInventario): ResultadoComposicao {
    const estoque = inventario.consultarEstoque();

    // Denominations sorted from largest to smallest (helps the DP bias toward big notes)
    const denominacoes = Array.from(estoque.values())
      .map(item => ({ valor: item.cedula.valorEmCentavos, qtdDisponivel: item.quantidade }))
      .sort((a, b) => b.valor - a.valor);

    const INF = Infinity;

    // dp[v] = menor número de cédulas para compor exatamente v centavos
    const dp: number[] = new Array(valorEmCentavos + 1).fill(INF);
    // usou[v] = {valor da cédula, quantidade} usada no último passo que levou ao estado v
    const usou: Array<{ denom: number; qtd: number } | null> = new Array(valorEmCentavos + 1).fill(null);
    dp[0] = 0;

    for (const { valor, qtdDisponivel } of denominacoes) {
      // Percorre de CIMA para BAIXO para que dp[prev] ainda não reflita a denominação
      // atual neste mesmo passo — garantindo o limite de qtdDisponivel (bounded knapsack).
      for (let v = valorEmCentavos; v >= valor; v--) {
        for (let k = 1; k <= qtdDisponivel && k * valor <= v; k++) {
          const prev = v - k * valor;
          if (dp[prev] !== INF && dp[prev] + k < dp[v]) {
            dp[v] = dp[prev] + k;
            usou[v] = { denom: valor, qtd: k };
          }
        }
      }
    }

    if (dp[valorEmCentavos] === INF) {
      return {
        sucesso: false,
        mensagem: "Não foi possível compor o valor com as cédulas disponíveis.",
      };
    }

    // Reconstrói a composição seguindo os ponteiros usou[]
    const composicao = new Map<number, number>();
    let restante = valorEmCentavos;
    while (restante > 0) {
      const passo = usou[restante]!;
      composicao.set(passo.denom, (composicao.get(passo.denom) ?? 0) + passo.qtd);
      restante -= passo.denom * passo.qtd;
    }

    return {
      sucesso: true,
      composicao,
      mensagem: `Composição encontrada com ${dp[valorEmCentavos]} cédula(s)/moeda(s).`,
    };
  }
}
