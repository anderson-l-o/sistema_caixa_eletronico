import { ICedula, Denominacao } from "./ICedula";

/**
 * Implementação concreta de uma cédula ou moeda.
 */
export class Cedula implements ICedula {
  readonly valorEmCentavos: Denominacao;
  readonly descricao: string;

  constructor(valorEmCentavos: Denominacao, descricao: string) {
    if (valorEmCentavos <= 0) {
      throw new Error("O valor da cédula deve ser positivo.");
    }
    this.valorEmCentavos = valorEmCentavos;
    this.descricao = descricao;
  }

  /** Retorna o valor formatado em Reais (ex: R$ 50,00) */
  get valorFormatado(): string {
    const reais = this.valorEmCentavos / 100;
    return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}
